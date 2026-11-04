import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

// Use the real app and components with deterministic in-memory data; no cloud writes.
async function useThemeFixtures(page: Page) {
  await page.route('**/src/app/createAppDependencies.ts*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      import { questions } from '/src/test/fixtures.ts';
      export async function createAppDependencies() {
        return {
          bankLoader: async () => ({ questions, version: 'theme-fixture' }),
          dataMode: 'firebase',
          authService: {
            mode: 'firebase',
            subscribe(listener) { listener({ uid: 'theme-learner', displayName: 'Trail Learner' }); return () => {}; },
          },
          commentStore: {
            listPage: async () => ({ writesEnabled: true, deletionPending: false, hasNext: false, items: [{
              id: 'theme-comment', authorUid: 'theme-learner', authorName: 'Trail',
              text: 'I compared the managed services before choosing my answer. The explanation helped clarify the tradeoff.',
              createdAt: 1793746800000, edited: false, likeCount: 2, dislikeCount: 0, score: 2, reaction: 'like',
            }] }),
          },
        };
      }
    `,
  }));
}

async function accessibleLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.addScriptTag({ content: axe.source });
  expect(await page.evaluate(async () => (await window.axe.run()).violations.filter(issue => ['serious', 'critical'].includes(issue.impact ?? '')))).toEqual([]);
}

test('submitted feedback overrides selection, and discussion keeps readable typography', async ({ page }, testInfo) => {
  await useThemeFixtures(page);
  await page.goto('/practice/');
  await expect(page.locator('.question-meta')).toContainText('PMLE-0001');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.brand')).toHaveCSS('font-family', /IBM Plex Mono/);
  await expect(page.locator('.intro h1')).toHaveCSS('font-weight', '400');
  await expect(page.locator('.question-prompt')).toHaveCSS('font-family', /IBM Plex Sans/);
  await expect(page.locator('.question-prompt')).toHaveCSS('font-size', '17px');
  await expect(page.locator('.question-prompt')).toHaveCSS('line-height', '28.05px');
  await page.getByRole('radio').first().check();
  const selected = page.locator('.choice').filter({ has: page.locator('input:checked') });
  await expect(selected).toHaveCSS('background-color', 'rgb(238, 242, 252)');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(selected).toHaveCSS('border-top-color', 'rgb(36, 115, 77)');
  await expect(selected).toHaveCSS('background-color', 'rgb(237, 246, 240)');
  await expect(selected).toContainText('Correct answer');
  await expect(page.locator('.ai-prompt-link svg')).toBeVisible();
  await expect(page.locator('.comment-text')).toHaveCSS('font-size', '17px');
  await expect(page.locator('.comment-text')).toHaveCSS('line-height', '28.05px');
  await expect(page.locator('.comment-reaction').first()).toHaveCSS('background-color', 'rgb(238, 242, 252)');
  await accessibleLayout(page);
  await page.locator('.question-discussion').screenshot({ scale: 'css', path: testInfo.outputPath('discussion.png') });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('practice.png'), fullPage: true });

  await page.locator('.question-navigation').getByRole('button', { name: /^Next/ }).click();
  await expect(page.locator('.question-meta')).toContainText('PMLE-0002');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('checkbox').last().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('.choice-wrong')).toHaveCSS('border-top-color', 'rgb(173, 61, 57)');
  await expect(page.locator('.choice-wrong')).toHaveCSS('background-color', 'rgb(252, 240, 239)');
  await expect(page.locator('.choice-wrong')).toContainText('Your selection');
  for (const correct of await page.locator('.choice-correct').all()) {
    await expect(correct).toHaveCSS('border-top-color', 'rgb(36, 115, 77)');
    await expect(correct).toHaveCSS('background-color', 'rgb(237, 246, 240)');
  }
  await accessibleLayout(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('incorrect.png'), fullPage: true });

  await page.getByRole('button', { name: 'View full summary →' }).click();
  await accessibleLayout(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('summary.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open account menu for Trail Learner' }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await accessibleLayout(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('settings.png'), fullPage: true });
});

test('public pages load Plex fonts and preserve ruled layouts at narrow widths', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 44px "IBM Plex Mono"'))).toBe(true);
  await expect(page.locator('h1')).toHaveCSS('font-family', /IBM Plex Mono/);
  await expect(page.locator('h1')).toHaveCSS('font-size', testInfo.project.name === 'mobile' ? '30px' : '44px');
  await accessibleLayout(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('homepage.png'), fullPage: true });
  for (const path of ['/faq/', '/pmle/faq/', '/agentic-ai/faq/', '/sample-questions/']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    if (path === '/sample-questions/') await page.locator('.sample-answer summary').first().click();
    await accessibleLayout(page);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('samples.png'), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await accessibleLayout(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ scale: 'css', path: testInfo.outputPath('homepage-320.png'), fullPage: true });
});
