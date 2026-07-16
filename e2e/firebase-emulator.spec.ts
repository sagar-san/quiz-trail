import { expect, test, type Page } from '@playwright/test';

async function signInWithNewEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.locator('.js-new-account').click();
  await popup.locator('#email-input').fill('trail-tester@example.com');
  await popup.locator('#display-name-input').fill('Trail Tester');
  await popup.locator('#sign-in').click();
  await popup.waitForEvent('close');
}

async function signInWithExistingEmulatorAccount(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.locator('.js-reuse-account').first().click();
  await popup.waitForEvent('close');
}

test('signs in, saves to Firestore, signs out, and restores after signing back in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await signInWithNewEmulatorAccount(page);
  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText('339 questions')).toBeVisible();

  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('Progress saved')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await signInWithExistingEmulatorAccount(page);

  await expect(page.getByText('Trail Tester')).toBeVisible();
  await expect(page.getByText('Progress saved')).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('Attempted1');
});
