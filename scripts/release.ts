import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { renderFirestoreRules, type ReleaseConfig } from './release-render.ts';
export { renderReleaseHtml, renderFirestoreRules } from './release-render.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
export function readReleaseConfig(): ReleaseConfig {
  const config = JSON.parse(readFileSync(resolve(root, 'release.config.json'), 'utf8'));
  if (typeof config?.agenticAiPublic !== 'boolean' || Object.keys(config).length !== 1) {
    throw new Error('release.config.json must contain only the boolean agenticAiPublic.');
  }
  return config;
}

export function prepareRelease(config = readReleaseConfig()): void {
  const output = resolve(root, '.tmp/release/firestore.rules');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, renderFirestoreRules(readFileSync(resolve(root, 'firestore.rules'), 'utf8'), config));
}

export function recordReleaseBuild(config: ReleaseConfig): void {
  prepareRelease(config);
  writeFileSync(resolve(root, '.tmp/release/build-config.json'), JSON.stringify(config));
}

function verifyRelease(): void {
  const config = readReleaseConfig();
  const built = JSON.parse(readFileSync(resolve(root, '.tmp/release/build-config.json'), 'utf8'));
  const expectedRules = renderFirestoreRules(readFileSync(resolve(root, 'firestore.rules'), 'utf8'), config);
  if (built.agenticAiPublic !== config.agenticAiPublic
    || readFileSync(resolve(root, '.tmp/release/firestore.rules'), 'utf8') !== expectedRules) {
    throw new Error('Release config changed since the build. Rebuild before deploying Hosting and rules.');
  }
  console.log(`Release verified: agenticAiPublic=${config.agenticAiPublic}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === 'prepare') prepareRelease();
  else if (process.argv[2] === 'verify') verifyRelease();
  else throw new Error('Use release.ts prepare or release.ts verify.');
}
