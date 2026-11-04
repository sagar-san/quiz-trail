import { expect, test } from '@playwright/test';

for (const [path, label, prefix] of [
  ['/sample-questions/', 'PMLE', 'PMLE-'],
  ['/agentic-ai/sample-questions/', 'PAA', 'PAA-'],
]) {
  test(`${label} samples work without JavaScript or sign-in`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
    const page = await context.newPage();
    const bankRequests: string[] = [];
    page.on('request', request => {
      if (/questions\.bin|privateQuestionBanks/.test(request.url())) bankRequests.push(request.url());
    });
    await page.goto(`${baseURL}/`);
    await page.locator(`.cert-links a[href="${path}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`10 Google Cloud ${label} sample questions`);
    await expect(page.locator('.sample-card')).toHaveCount(10);
    const ids = await page.locator('.sample-card').evaluateAll(cards => cards.map(card => card.getAttribute('data-question-id')));
    expect(new Set(ids).size).toBe(10);
    expect(ids.every(id => id?.startsWith(prefix))).toBe(true);
    await page.locator('summary').first().click();
    await expect(page.locator('.sample-answer[open]')).toContainText('Answer:');
    await expect(page.locator('.sample-answer[open] a')).toHaveAttribute('href', /^https:\/\//);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(bankRequests).toEqual([]);
    await context.close();
  });
}
