export interface ReleaseConfig { agenticAiPublic: boolean }

/** Resolve both availability variants before Vite parses/builds the static HTML. */
export function renderReleaseHtml(html: string, config: ReleaseConfig): string {
  const rendered = html.replace(/<!-- paa:public -->([\s\S]*?)<!-- paa:preview -->([\s\S]*?)<!-- paa:end -->/g,
    (_match, available: string, preview: string) => config.agenticAiPublic ? available : preview);
  if (/<!-- paa:/.test(rendered)) throw new Error('Unmatched PAA availability block.');
  return rendered;
}

export function renderFirestoreRules(source: string, config: ReleaseConfig): string {
  const marker = 'return false; // @agenticAiPublic';
  if (source.split(marker).length !== 2) throw new Error('Expected one PAA release marker in firestore.rules.');
  return source.replace(marker, `return ${config.agenticAiPublic}; // Generated from release.config.json`);
}
