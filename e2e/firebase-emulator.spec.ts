import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async () => {
  await Promise.all([
    fetch('http://127.0.0.1:9099/emulator/v1/projects/quiz-trail/accounts', { method: 'DELETE' }),
    fetch('http://127.0.0.1:8080/emulator/v1/projects/quiz-trail/databases/(default)/documents', { method: 'DELETE' }),
  ]);
});

async function signInWithNewEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.locator('.js-new-account').click();
  await expect(popup.locator('#email-input')).toBeVisible();
  await popup.locator('#email-input').fill('trail-tester@example.com');
  await popup.locator('#display-name-input').fill('Trail Tester');
  await popup.locator('#sign-in').click();
  await popup.waitForEvent('close');
}

async function signInWithExistingEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.getByText('trail-tester@example.com', { exact: true }).click();
  await popup.waitForEvent('close');
}

test('signs in, saves to Firestore, signs out, and restores after signing back in', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/practice/');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await signInWithNewEmulatorAccount(page);
  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText('408 questions')).toBeVisible();

  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('Progress saved')).toBeVisible();

  await page.getByRole('button', { name: /Open account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Account & data' })).toBeVisible();
  await expect(page.getByText('trail-tester@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await signInWithExistingEmulatorAccount(page);

  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText('Progress saved')).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});
