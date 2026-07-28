import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async () => {
  await Promise.all([
    fetch('http://127.0.0.1:9099/emulator/v1/projects/quiz-trail/accounts', { method: 'DELETE' }),
    fetch('http://127.0.0.1:8080/emulator/v1/projects/quiz-trail/databases/(default)/documents', { method: 'DELETE' }),
  ]);
  const feedbackConfigResponse = await fetch(
    'http://127.0.0.1:8080/v1/projects/quiz-trail/databases/(default)/documents/config/feedback',
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { enabled: { booleanValue: true } } }),
    },
  );
  expect(feedbackConfigResponse.ok).toBe(true);
});

async function signInWithNewEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in to save progress' }).click();
  const popup = await popupPromise;
  await popup.getByRole('button', { name: 'Add new account' }).click();
  await expect(popup.locator('#email-input')).toBeVisible();
  await popup.locator('#email-input').fill('trail-tester@example.com');
  await popup.locator('#display-name-input').fill('Trail Tester');
  await popup.locator('#sign-in').click();
  await popup.waitForEvent('close');
}

async function signInWithExistingEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in to save progress' }).click();
  const popup = await popupPromise;
  await popup.getByText('trail-tester@example.com', { exact: true }).click();
  await popup.waitForEvent('close');
}

async function seedFeedback(questionId: string, text: string) {
  const accountsResponse = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/quiz-trail/accounts:batchGet?maxResults=-1',
    { headers: { Authorization: 'Bearer owner' } },
  );
  const accounts = await accountsResponse.json() as {
    users?: Array<{ email?: string; localId?: string }>;
  };
  const userId = accounts.users?.find((account) => (
    account.email === 'trail-tester@example.com'
  ))?.localId;
  expect(userId).toBeTruthy();

  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/quiz-trail/databases/(default)/documents/questionFeedback/${encodeURIComponent(questionId)}/submissions/${encodeURIComponent(userId!)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          text: { stringValue: text },
          submittedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
  expect(response.ok).toBe(true);
}

test('signs in, saves to Firestore, signs out, and restores after signing back in', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/practice/');
  await expect(page.getByText('Practicing as a guest')).toBeVisible();
  await expect(page.getByText('10 questions', { exact: true })).toBeVisible();
  expect(await page.locator('.guest-banner').evaluate((banner) => banner.nextElementSibling?.classList.contains('filter-wrap'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Sign in to save progress' })).toBeVisible();
  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.getByText('✓ Saved!')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Practicing as a guest')).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('Attempted0');
  await signInWithNewEmulatorAccount(page);
  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText(/\d+ questions/)).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('Attempted0');

  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('✓ Saved!')).toBeVisible();
  const questionId = await page.locator('.question-meta').evaluate((element) => (
    element.lastElementChild?.textContent ?? ''
  ));
  const feedbackText = 'The explanation needs a clearer reference.';
  await seedFeedback(questionId, feedbackText);
  await page.locator('.more-options-details > summary').click();
  const feedbackInput = page.getByPlaceholder(/Describe what seems incorrect/);
  await expect(feedbackInput).toHaveValue(feedbackText);
  await feedbackInput.fill('The updated feedback has more detail.');
  await page.getByRole('button', { name: 'Update feedback' }).click();
  await expect(page.getByText('Feedback saved successfully.')).toBeVisible();

  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.locator('.question-meta')).toContainText(questionId);
  const nextButton = page.getByRole('button', { name: 'Next', exact: true });
  if (await nextButton.isEnabled()) {
    await nextButton.click();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.locator('.question-meta')).toContainText(questionId);
  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.locator('.more-options-details > summary').click();
  await expect(page.getByPlaceholder(/Describe what seems incorrect/)).toHaveValue(
    'The updated feedback has more detail.',
  );

  await page.getByRole('button', { name: /Open account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Account & data' })).toBeVisible();
  await expect(page.getByText('trail-tester@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('Practicing as a guest')).toBeVisible();
  await signInWithExistingEmulatorAccount(page);

  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('Attempted1');

  await page.getByRole('button', { name: /Open account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByLabel(/Type DELETE/).fill('DELETE');
  const reauthenticationPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Permanently delete account' }).click();
  const popup = await reauthenticationPopup;
  await popup.getByText('trail-tester@example.com', { exact: true }).click();
  await popup.waitForEvent('close');
  await expect(page.getByText('Practicing as a guest')).toBeVisible();
});
