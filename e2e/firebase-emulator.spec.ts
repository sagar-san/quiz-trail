import { expectedHeaders } from '../src/data/csv/questionCsvSchema';
import { encryptQuestionBank } from '../../quiz-trail-question-bank/scripts/question-bank';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async () => {
  await Promise.all([
    fetch('http://127.0.0.1:9099/emulator/v1/projects/quiz-trail/accounts', { method: 'DELETE' }),
    fetch('http://127.0.0.1:8080/emulator/v1/projects/quiz-trail/databases/(default)/documents', { method: 'DELETE' }),
  ]);
  const feedbackConfigResponse = await fetch(
    'http://127.0.0.1:8080/v1/projects/quiz-trail/databases/(default)/documents/config/comments',
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

async function signInWithNewEmulatorAccount(
  page: Page,
  trigger: () => Promise<void> = () => page.getByRole('button', { name: 'Sign in to save progress' }).click(),
  email = 'trail-tester@example.com',
) {
  const popupPromise = page.waitForEvent('popup');
  await trigger();
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  await popup.getByRole('button', { name: 'Add new account' }).click();
  await expect(popup.locator('#email-input')).toBeVisible();
  await popup.locator('#email-input').fill(email);
  await popup.locator('#display-name-input').fill('Trail Tester');
  await popup.locator('#sign-in').click();
  await popup.waitForEvent('close');
}

test('PMLE-specific sign-in still opens PMLE practice', async ({ page }) => {
  await page.goto('/');

  await signInWithNewEmulatorAccount(
    page,
    () => page.getByRole('link', { name: /Already have saved progress/ }).click(),
  );

  await expect(page).toHaveURL(/\/practice\/$/);
  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText(/\d+ questions/)).toBeVisible();
});

test('homepage sign-in stays on the catalog and shares the session with practice', async ({ page }) => {
  const bankRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('questions.bin') || request.url().includes('privateQuestionBanks')) bankRequests.push(request.url());
  });
  await page.goto('/');
  await signInWithNewEmulatorAccount(page, () => page.getByRole('button', { name: 'Sign in', exact: true }).click());
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'GCP AI Certification practice' })).toBeVisible();
  await expect(page.getByText('Signed in. Choose a certification below to continue.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Practice PAA preview' })).toHaveCount(0);
  expect(bankRequests).toEqual([]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practice PMLE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open account menu for Trail Tester' })).toBeVisible();
  await expect(page.getByText('Practicing as a guest')).toHaveCount(0);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Practice PMLE', exact: true }).click();
  await expect(page.getByText('Practicing as a guest')).toBeVisible();
});

async function signInWithExistingEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in to save progress' }).click();
  const popup = await popupPromise;
  await popup.getByText('trail-tester@example.com', { exact: true }).click();
  await popup.waitForEvent('close');
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
  await page.getByLabel('Post as Trail Tester').fill('The explanation needs a clearer reference.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('.comment-text')).toHaveText('The explanation needs a clearer reference.');
  await page.getByRole('button', { name: 'Like (0)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Like (1)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dislike (0)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dislike (1)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Edit comment', { exact: true }).fill('An updated shared comment.');
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.locator('.comment-text')).toHaveText('An updated shared comment.');

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
  await expect(page.locator('.comment-text')).toHaveText('An updated shared comment.');

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

async function seedPrivatePreview() {
  const values: Record<string, string> = { question_id: 'PAA-0001', question_type: 'single_choice', question: 'Synthetic private preview question', option_a: 'First choice', option_b: 'Second choice', correct_answer: 'A', explanation: 'Synthetic test explanation', exam_section: 'Test section', exam_objectives: 'Test objective', topics: 'Test topic', question_source: 'Synthetic test', review_status: 'Needs Review', difficulty: 'Medium', is_outdated: 'FALSE' };
  const csv = [expectedHeaders.join(','), expectedHeaders.map((key) => JSON.stringify(values[key] ?? '')).join(',')].join('\n');
  const asset = Buffer.from(encryptQuestionBank(new TextEncoder().encode(csv))).toString('base64');
  const response = await fetch('http://127.0.0.1:8080/v1/projects/quiz-trail/databases/(default)/documents/privateQuestionBanks/agentic-ai', {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { asset: { stringValue: asset }, format: { stringValue: 'aes-gcm-v1' } } }),
  });
  expect(response.ok).toBe(true);
}

test('private summary denies guests and other signed-in users', async ({ page }) => {
  await seedPrivatePreview();
  await page.goto('/practice/?cert=agentic-ai&view=summary');
  await expect(page.getByRole('heading', { name: 'Professional Agentic Architect is coming soon' })).toBeVisible();
  await expect(page.getByText('Synthetic private preview question')).toHaveCount(0);
  await signInWithNewEmulatorAccount(page, () => page.getByRole('button', { name: 'Sign in', exact: true }).click());
  await expect(page.getByText('This preview is not available to this account.')).toBeVisible();
  await expect(page.getByText('Synthetic private preview question')).toHaveCount(0);
});

test('owner preview loads protected content and retains independent progress across certification switches', async ({ page }) => {
  await seedPrivatePreview();
  await page.goto('/');
  await signInWithNewEmulatorAccount(page, () => page.getByRole('button', { name: 'Sign in', exact: true }).click(), 'ssanghani@gmail.com');
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Practice PAA preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Professional Agentic Architect practice questions' })).toBeVisible();
  await page.getByRole('radio', { name: 'A First choice' }).check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('✓ Saved!')).toBeVisible();
  await page.getByRole('button', { name: 'Save for later' }).click();
  await page.getByRole('link', { name: 'PMLE', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Professional Machine Learning Engineer practice questions' })).toBeVisible();
  await page.getByRole('link', { name: 'PAA preview', exact: true }).click();
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(page.getByText('Synthetic private preview question', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved for later' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/practice/?cert=agentic-ai&view=summary');
  await expect(page.getByRole('heading', { name: 'PAA progress summary' })).toBeVisible();
  await expect(page.locator('.overall-grid > div').filter({ hasText: 'Attempted' }).locator('strong')).toHaveText('1');
  await expect(page.locator('footer').getByRole('link', { name: 'PAA FAQ' })).toHaveAttribute('href', '/agentic-ai/faq/');
  await expect(page.locator('footer').getByRole('link', { name: /PMLE/ })).toHaveCount(0);
  await page.goto('/practice/?view=summary');
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
  await expect(page.locator('.overall-grid > div').filter({ hasText: 'Attempted' }).locator('strong')).toHaveText('0');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Practice PAA preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Practice PAA preview' })).toHaveCount(0);
});

for (const mobile of [false, true]) {
  test(`discussion pagination and keyboard controls (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/');
    await signInWithNewEmulatorAccount(page);
    await expect(page.getByRole('button', { name: 'Open account menu for Trail Tester' })).toBeVisible();
    await page.locator('.question-card input').first().check();
    const questionId = await page.locator('.question-meta span').last().textContent();
    for (let i = 0; i < 12; i++) {
      const response = await fetch(`http://127.0.0.1:8080/v1/projects/quiz-trail/databases/(default)/documents/questionComments/seed-${String(i).padStart(2, '0')}`, {
        method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          certificationId: { stringValue: 'pmle' }, questionId: { stringValue: questionId },
          authorUid: { stringValue: 'seed-author' }, authorName: { stringValue: 'Another learner' },
          text: { stringValue: `Comment ${i + 1}` }, createdAt: { timestampValue: '2026-01-01T00:00:00.000000001Z' },
          updatedAt: { timestampValue: '2026-01-01T00:00:00.000000001Z' }, deleted: { booleanValue: false },
          likeCount: { integerValue: '0' }, dislikeCount: { integerValue: '0' }, score: { integerValue: '0' },
        } }),
      });
      expect(response.ok).toBe(true);
    }
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.locator('.comment-text')).toHaveCount(10);
    await page.getByRole('button', { name: 'Next comments' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.comment-text')).toHaveCount(2);
    await expect(page.locator('.comment-text').first()).toHaveText('Comment 11');
    await expect(page.getByRole('button', { name: 'Next comments' })).toBeDisabled();
    await page.getByRole('button', { name: 'Previous comments' }).click();
    await expect(page.locator('.comment-text')).toHaveCount(10);
    await page.getByRole('button', { name: 'Like (0)', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Like (1)', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/discussion-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
  });
}
