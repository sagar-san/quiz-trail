import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/practice/');
  await expect(page.locator('.total-count')).toHaveText(/\d+ questions/);
});

test('publishes search and sharing metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Quiz Trail — GCP AI Certification Practice');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /GCP AI certification practice/);
  await expect(page.locator('meta[name="msvalidate.01"]')).toHaveAttribute('content', '8F229F43FC2B6591BCF83CD94C352C76');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Quiz Trail/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
  await expect(page.getByRole('heading', { name: 'GCP AI Certification practice' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Practice PMLE' })).toHaveAttribute('href', '/practice/');
  await expect(page.getByRole('link', { name: 'Continue PMLE →' })).toHaveAttribute('href', '/practice/');
  await expect(page.getByRole('button', { name: 'Local mode', exact: true })).toBeDisabled();
  await expect(page.locator('.public-nav a[href*="practice"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Practice Agentic AI' })).toHaveAttribute('href', '/practice/?cert=agentic-ai');

  const landing = await page.request.get('/');
  const landingHtml = await landing.text();
  expect(landingHtml).toContain('<h1>GCP AI Certification<br />practice</h1>');
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
  expect(await sitemap.text()).toContain('<loc>https://quiz-trail.web.app/pmle/faq/</loc>');
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

test('general and exam FAQs are public, linked, and have valid structured data', async ({ page }) => {
  const faqs = [
    { path: '/faq/', title: 'Quiz Trail FAQ | Accounts, Progress and Practice', heading: 'Using Quiz Trail' },
    { path: '/pmle/faq/', title: 'Google Cloud PMLE Practice FAQ | Quiz Trail', heading: 'Google Cloud PMLE practice questions, answered.' },
    { path: '/agentic-ai/faq/', title: 'Professional Agentic Architect Practice FAQ | Quiz Trail', heading: 'Professional Agentic Architect practice, explained.' },
  ];
  for (const faq of faqs) {
    await page.goto(faq.path);
    await expect(page).toHaveTitle(faq.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://quiz-trail.web.app${faq.path}`);
    await expect(page.getByRole('heading', { name: faq.heading, exact: true })).toBeVisible();
    const schemaText = await page.locator('script[data-quiz-trail-schema="faq"]').textContent();
    const schema = JSON.parse(schemaText!);
    expect(schema['@type']).toBe('FAQPage');
    expect(schemaText).not.toMatch(/Buy Me a Coffee|GitHub/);
    expect(schema.mainEntity.map((item: { name: string }) => item.name)).toEqual(await page.locator('.faq-card h2').allTextContents());
    const response = await page.request.get(faq.path);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(`<h1>${faq.heading}</h1>`);
    await page.addScriptTag({ content: axe.source });
    expect(await page.evaluate(async () => (await window.axe.run()).violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? '')))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
  await page.getByRole('navigation', { name: 'FAQ topics' }).getByRole('link', { name: 'FAQ', exact: true }).click();
  await expect(page).toHaveURL(/\/faq\/$/);
  await expect(page.getByRole('heading', { name: 'When is my progress saved?' })).toBeVisible();
  await page.getByRole('navigation', { name: 'FAQ topics' }).getByRole('link', { name: 'PMLE FAQ', exact: true }).click();
  await expect(page).toHaveURL(/\/pmle\/faq\/$/);
  await page.getByLabel('Ready to practice?').getByRole('link', { name: 'Practice PMLE' }).click();
  await expect(page).toHaveURL(/\/practice\/$/);
  await expect(page.locator('footer').getByRole('link', { name: 'PMLE FAQ', exact: true })).toHaveAttribute('href', '/pmle/faq/');
  await expect(page.locator('footer').getByRole('link', { name: 'FAQ', exact: true })).toHaveAttribute('href', '/faq/');
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

test('tip links are public while GitHub support UI stays in debug mode', async ({ page }) => {
  await expect(page.locator('footer').getByRole('link', { name: 'Buy Me a Coffee' })).toHaveAttribute('href', 'https://buymeacoffee.com/okeanos');
  await expect(page.getByRole('link', { name: /GitHub/ })).toHaveCount(0);

  for (const path of ['/', '/faq/', '/pmle/faq/', '/agentic-ai/faq/', '/sample-questions/']) {
    await page.goto(path);
    await expect(page.locator('footer').getByRole('link', { name: 'Buy Me a Coffee' })).toBeVisible();
    await expect(page.getByRole('link', { name: /GitHub/ })).toHaveCount(0);
  }

  await page.goto('/?debug=true');
  await expect(page.getByRole('link', { name: 'Buy Me a Coffee' })).toBeVisible();
  await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible();
  await page.goto('/faq/?debug=true');
  await expect(page.getByRole('link', { name: /Buy Me a Coffee/ })).toHaveCount(2);
  await expect(page.getByRole('link', { name: /GitHub/ })).toHaveCount(3);
  await page.goto('/sample-questions/?debug=true');
  await expect(page.getByRole('link', { name: 'Buy Me a Coffee' })).toBeVisible();
  await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible();

  await page.goto('/practice/?debug=true');
  await expect(page.getByRole('link', { name: 'Buy Me a Coffee' })).toHaveCount(2);
  await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('link', { name: 'Support via Buy Me a Coffee' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open a GitHub issue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Star Quiz Trail on GitHub' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Reset certification progress' }).click();
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
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
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

test('certification catalog is accessible and unsupported local routes fail clearly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Available', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'PAA summary' })).toHaveAttribute('href', '/practice/?cert=agentic-ai&view=summary');
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => (await window.axe.run()).violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical'));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/practice/?cert=unknown');
  await expect(page.getByText('Unknown certification. Return home to choose a certification.')).toBeVisible();
  await page.goto('/practice/?cert=agentic-ai');
  await expect(page.getByText('PAA practice requires Firebase mode and Google sign-in.')).toBeVisible();
  await expect(page.locator('.question-card')).toHaveCount(0);
});


test('certification resource links open the right FAQ and summary', async ({ page }) => {
  const header = page.locator('.site-header');
  await expect(header.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: /FAQ|summary|Certifications/ })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Home', exact: true })).toHaveCSS('border-top-width', '0px');
  await page.locator('footer').getByRole('link', { name: 'PMLE summary', exact: true }).click();
  await expect(page).toHaveURL(/view=summary/);
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
  await expect(page).toHaveTitle('PMLE Progress Summary | Quiz Trail');
  await page.getByRole('button', { name: '← Back to PMLE practice' }).click();
  await expect(page).toHaveURL(/\/practice\/$/);

  await header.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('navigation', { name: 'PMLE resources' }).getByRole('link', { name: 'PMLE summary' }).click();
  await expect(page.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
  await page.goto('/');
  await page.getByRole('navigation', { name: 'PAA resources' }).getByRole('link', { name: 'PAA FAQ' }).click();
  await expect(page).toHaveURL(/\/agentic-ai\/faq\/$/);
  await expect(page.getByRole('heading', { name: 'Professional Agentic Architect practice, explained.' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://quiz-trail.web.app/agentic-ai/faq/');
  const html = await (await page.request.get('/agentic-ai/faq/')).text();
  expect(html).toContain('FAQPage');
  expect(html).toContain('Sign in with Google to practice all 150 PAA questions');
  await page.addScriptTag({ content: axe.source });
  expect(await page.evaluate(async () => (await window.axe.run()).violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? '')))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.locator('footer').getByRole('link', { name: 'PAA summary' }).click();
  await expect(page).toHaveURL(/cert=agentic-ai&view=summary/);
  await expect(page.getByText('PAA practice requires Firebase mode and Google sign-in.')).toBeVisible();
  await expect(page.locator('.analytics-summary, .question-card')).toHaveCount(0);
});
