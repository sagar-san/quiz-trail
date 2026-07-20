import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('408 questions')).toBeVisible();
});

test('publishes search and sharing metadata', async ({ page }) => {
  await expect(page).toHaveTitle('Quiz Trail — Google Cloud PMLE Practice Questions');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /carefully curated bank of 408 practice questions/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Quiz Trail/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');

  const robots = await page.request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://quiz-trail.web.app/sitemap.xml');

  const sitemap = await page.request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/</loc>');
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/faq</loc>');
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/sample-questions</loc>');
});

test('FAQ is public, crawlable, and returns to practice', async ({ page }) => {
  await page.getByRole('link', { name: 'FAQ', exact: true }).first().click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page).toHaveTitle('Google Cloud PMLE Practice FAQ | Quiz Trail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/faq');
  await expect(page.getByRole('heading', { name: 'Google Cloud PMLE practice questions, answered.' })).toBeVisible();
  const faqSchema = page.locator('script[data-quiz-trail-schema="faq"]');
  await expect(faqSchema).toHaveCount(1);
  expect(await faqSchema.evaluate((script) => script.textContent)).toContain('FAQPage');
  await page.getByRole('button', { name: 'Start practicing' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('408 questions')).toBeVisible();
});

test('sample page publishes ten canonical questions with explanations', async ({ page }) => {
  await page.getByRole('link', { name: /Try 10 free PMLE sample questions/ }).click();
  await expect(page).toHaveURL(/\/sample-questions$/);
  await expect(page).toHaveTitle('10 Google Cloud PMLE Sample Questions | Quiz Trail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/sample-questions');
  await expect(page.locator('.sample-card')).toHaveCount(10);
  await expect(page.locator('.sample-card').first()).toContainText('A RAG application must serve users in two geographic regions');
  await page.locator('.sample-answer summary').first().click();
  await expect(page.locator('.sample-answer').first()).toContainText('Regional co-location or compliant replication');

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run('.samples-shell');
    return results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
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
