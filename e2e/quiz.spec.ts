import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('339 questions')).toBeVisible();
});

test('answer, save, reload, filter, and reset the real question bank', async ({ page }, testInfo) => {
  const firstCard = page.locator('.question-card');
  await expect(firstCard).toContainText('PMLE-0001');
  await firstCard.locator('input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Correct' })).toBeVisible();
  await page.getByRole('button', { name: 'Save for later' }).click();

  for (let index = 0; index < 2; index += 1) {
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.locator('.question-card input').first().check();
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.locator('.feedback')).toBeVisible();
  }

  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('Progress saved')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Progress saved')).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('3');

  if (testInfo.project.name === 'mobile') {
    await page.locator('.filter-select select').selectOption('saved');
  } else {
    await page.getByRole('button', { name: 'Saved', exact: true }).click();
  }
  await expect(page.locator('.question-card')).toContainText('PMLE-0001');
  await page.getByRole('button', { name: 'Saved for later' }).click();
  await expect(page.getByRole('button', { name: 'Save for later' })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await page.locator('.filter-select select').selectOption('all');
    await page.locator('.filter-select select').selectOption('saved');
  } else {
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Saved', exact: true }).click();
  }
  await expect(page.getByText('Nothing here right now')).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.locator('.stat-grid')).toContainText('Attempted0');
});

test('primary screen has no serious accessibility violations or horizontal overflow', async ({ page }) => {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run('#quiz');
    return results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  });
  expect(violations).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
