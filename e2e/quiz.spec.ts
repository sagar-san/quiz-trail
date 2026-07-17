import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('408 questions')).toBeVisible();
});

test('answer, save, reload, filter, and reset the real question bank', async ({ page }, testInfo) => {
  const firstCard = page.locator('.question-card');
  const firstQuestionId = await firstCard.locator('.question-meta span').last().textContent();
  expect(firstQuestionId).toMatch(/^PMLE-\d{4}$/);
  await firstCard.locator('input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
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
  await expect(page.locator('.question-card')).toContainText(firstQuestionId ?? '');
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
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await page.getByRole('button', { name: '← Back to quiz' }).click();
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

test('analytics summary is accessible and review queues return to practice', async ({ page }) => {
  await page.getByRole('button', { name: 'View full summary →' }).click();
  await expect(page.getByRole('heading', { name: 'See where you stand.' })).toBeVisible();
  await expect(page.getByText('408', { exact: true }).first()).toBeVisible();
  await page.getByText('By topic', { exact: true }).click();
  await expect(page.locator('details.analytics-details').filter({ hasText: 'By topic' })).toHaveAttribute('open', '');

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run('#quiz');
    return results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.getByRole('button', { name: /Unanswered/ }).click();
  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible();
});
