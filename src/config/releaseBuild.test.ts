import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderReleaseHtml, renderFirestoreRules } from '../../scripts/release-render';

for (const agenticAiPublic of [false, true]) {
  describe(`PAA release flag ${agenticAiPublic}`, () => {
    const config = { agenticAiPublic };
    it('renders matching public catalog actions and valid FAQ structured data', () => {
      const catalog = renderReleaseHtml(readFileSync('index.html', 'utf8'), config);
      expect(/<a[^>]+href="\/practice\/\?cert=agentic-ai">Practice Agentic AI/.test(catalog)).toBe(agenticAiPublic);
      expect(catalog.includes('disabled title="Coming soon"')).toBe(!agenticAiPublic);
      expect(catalog).not.toContain('<!-- paa:');
      for (const path of ['faq/index.html', 'agentic-ai/faq/index.html', 'agentic-ai/sample-questions/index.html']) {
        const html = renderReleaseHtml(readFileSync(path, 'utf8'), config);
        for (const script of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
          expect(() => JSON.parse(script[1])).not.toThrow();
        }
        if (agenticAiPublic) expect(html).not.toMatch(/coming soon|private preview|authorized preview account/i);
      }
    });
    it('generates the same release value for Firestore authorization', () => {
      const rules = renderFirestoreRules(readFileSync('firestore.rules', 'utf8'), config);
      expect(rules).toContain(`return ${agenticAiPublic}; // Generated from release.config.json`);
      expect(rules).not.toContain('@agenticAiPublic');
    });
  });
}
it('rejects malformed templates and missing rules markers', () => {
  expect(() => renderReleaseHtml('<!-- paa:public -->unfinished', { agenticAiPublic: false })).toThrow();
  expect(() => renderFirestoreRules('rules without marker', { agenticAiPublic: false })).toThrow();
});
