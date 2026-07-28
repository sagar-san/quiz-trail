import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/practice/');
  await expect(page.locator('.total-count')).toHaveText(/\d+ questions/);
});

test('publishes search and sharing metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Quiz Trail — Google Cloud PMLE Practice Questions');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /400\+ free practice questions/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Quiz Trail/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
  await expect(page.getByRole('heading', { name: 'PMLE practice engine' })).toBeVisible();
  await expect(page.locator('.landing-hero').getByRole('link', { name: 'Try it out' })).toHaveAttribute('href', '/practice/');

  const landing = await page.request.get('/');
  const landingHtml = await landing.text();
  expect(landingHtml).toContain('<h1>PMLE practice engine</h1>');
  expect(landingHtml).toContain('href="/sample-questions/"');

  const robots = await page.request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://quiz-trail.web.app/sitemap.xml');

  const searchConsoleVerification = await page.request.get('/googlefc1ab9cdc98895c8.html');
  expect(searchConsoleVerification.ok()).toBe(true);
  expect(searchConsoleVerification.headers()['content-type']).toContain('text/html');
  expect(await searchConsoleVerification.text()).toMatch(/^google-site-verification:/);

  const sitemap = await page.request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/</loc>');
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/faq/</loc>');
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/sample-questions/</loc>');

  const llms = await page.request.get('/llms.txt');
  expect(llms.ok()).toBe(true);
  expect(llms.headers()['content-type']).toContain('text/plain');
  const llmsText = await llms.text();
  expect(llmsText).toContain('# Quiz Trail');
  expect(llmsText).toContain('[10 free PMLE sample questions](https://quiz-trail.web.app/sample-questions/)');
});

test('initial load scrolls to just above progress', async ({ page }) => {
  await page.waitForFunction(() => {
    const header = document.querySelector('.site-header');
    const progressStart = document.querySelector('#progress-start');
    if (!header || !progressStart) return false;
    const y = progressStart.getBoundingClientRect().y;
    return y >= header.getBoundingClientRect().height + 38 && y <= header.getBoundingClientRect().height + 46;
  });
  const header = await page.locator('.site-header').boundingBox();
  const progressStart = await page.locator('#progress-start').boundingBox();
  expect(header).not.toBeNull();
  expect(progressStart).not.toBeNull();
  expect(progressStart!.y).toBeGreaterThanOrEqual(header!.height + 38);
  expect(progressStart!.y).toBeLessThanOrEqual(header!.height + 46);
});

test('FAQ is public, crawlable, and returns to practice', async ({ page }) => {
  await page.goto('/faq/');
  await expect(page).toHaveURL(/\/faq\/$/);
  await expect(page).toHaveTitle('Google Cloud PMLE Practice FAQ | Quiz Trail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/faq/');
  await expect(page.getByRole('heading', { name: 'Google Cloud PMLE practice questions, answered.' })).toBeVisible();
  const faqSchema = page.locator('script[data-quiz-trail-schema="faq"]');
  await expect(faqSchema).toHaveCount(1);
  expect(await faqSchema.evaluate((script) => script.textContent)).toContain('FAQPage');
  await page.getByLabel('Ready to practice?').getByRole('link', { name: 'Try it out' }).click();
  await expect(page).toHaveURL(/\/practice\/$/);
  await expect(page.getByText(/\d+ questions/)).toBeVisible();
});

test('sample page publishes ten canonical questions with explanations', async ({ page }) => {
  await page.goto('/sample-questions/');
  await expect(page).toHaveURL(/\/sample-questions\/$/);
  await expect(page).toHaveTitle('10 Google Cloud PMLE Sample Questions | Quiz Trail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/sample-questions/');
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

test('practice entry is separate from public search pages', async ({ page }) => {
  await expect(page).toHaveURL(/\/practice\/$/);
  await expect(page).toHaveTitle('Practice Google Cloud PMLE Questions | Quiz Trail');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/practice/');
  await expect(page.getByRole('heading', { name: 'Professional Machine Learning Engineer practice questions' })).toBeVisible();
});

test('submitted answers and bookmarks save, reload, filter, and reset', async ({ page }, testInfo) => {
  const firstCard = page.locator('.question-card');
  const firstQuestionId = await firstCard.locator('.question-meta span').last().textContent();
  expect(firstQuestionId).toMatch(/^PMLE-\d{4}$/);
  await firstCard.locator('input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.getByText('✓ Saved!')).toBeVisible();
  await page.getByRole('button', { name: 'Save for later' }).click();

  for (let index = 0; index < 9; index += 1) {
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.locator('.question-card input').first().check();
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await expect(page.getByText('✓ Saved!')).toBeVisible();
  }

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run('#quiz');
    return results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.reload();
  await expect(page.locator('.stat-grid')).toContainText('Attempted10');

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

test('copies an AI review prompt after leaving and returning to the tab', async ({ page, context }) => {
  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Copy AI review prompt' }).click();
  await expect(page.getByRole('button', { name: 'AI review prompt copied' })).toBeVisible();

  const otherPage = await context.newPage();
  await otherPage.setContent('<label>Unrelated tab<textarea>Unrelated content</textarea></label>');
  await otherPage.bringToFront();
  await otherPage.locator('textarea').fill('');
  await otherPage.locator('textarea').focus();
  await otherPage.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  await page.bringToFront();

  await page.getByRole('button', { name: /^Next/ }).click();
  await page.locator('.question-card input').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Copy AI review prompt' }).click();
  await expect(page.getByRole('button', { name: 'AI review prompt copied' })).toBeVisible();
  await otherPage.close();
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
  await expect(page.locator('.overall-grid > div').filter({ hasText: 'Remaining' }).locator('strong')).toHaveText(/^\d+$/);
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
