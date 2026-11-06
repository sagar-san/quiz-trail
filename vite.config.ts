import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createDecipheriv } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';
import { readReleaseConfig, renderReleaseHtml, recordReleaseBuild } from './scripts/release.ts';
import { questionBankEncryptionKey } from '../quiz-trail-question-bank/scripts/encryption.ts';

const releaseConfig = readReleaseConfig();

const questionBankKeyVersion = [...questionBankEncryptionKey]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')
  .slice(0, 12);

export default defineConfig({
  plugins: [react(), {
    name: 'certification-release',
    transformIndexHtml: { order: 'pre', handler: (html) => renderReleaseHtml(html, releaseConfig) },
    writeBundle() { recordReleaseBuild(releaseConfig); },
  }, {
    name: 'local-question-bank',
    // Only the public PMLE bank is served here, and only by the dev server.
    configureServer(server) {
      server.middlewares.use('/__dev/question-bank.csv', async (_request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        try {
          const upstream = await fetch(`https://storage.googleapis.com/quiz-trail-question-banks/questions.bin?key=${questionBankKeyVersion}`);
          if (!upstream.ok) throw new Error(`Question bank returned HTTP ${upstream.status}`);
          const asset = Buffer.from(await upstream.arrayBuffer());
          if (asset.length < 32 || asset.subarray(0, 4).toString() !== 'QTB1') {
            throw new Error('Unsupported question-bank format');
          }
          const decipher = createDecipheriv('aes-256-gcm', questionBankEncryptionKey, asset.subarray(4, 16));
          decipher.setAuthTag(asset.subarray(-16));
          const csv = Buffer.concat([decipher.update(asset.subarray(16, -16)), decipher.final()]);
          response.setHeader('Content-Type', 'text/csv; charset=utf-8');
          response.end(csv);
        } catch (error) {
          server.config.logger.error(`Local question bank: ${String(error)}`);
          response.statusCode = 502;
          response.end('The public question bank could not be loaded.');
        }
      });
    },
  }],
  define: {
    __QUESTION_BANK_ENCRYPTION_KEY__: JSON.stringify([...questionBankEncryptionKey]),
    __QUESTION_BANK_KEY_VERSION__: JSON.stringify(questionBankKeyVersion),
  },
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        faq: fileURLToPath(new URL('./faq/index.html', import.meta.url)),
        pmleFaq: fileURLToPath(new URL('./pmle/faq/index.html', import.meta.url)),
        paaFaq: fileURLToPath(new URL('./agentic-ai/faq/index.html', import.meta.url)),
        paaSamples: fileURLToPath(new URL('./agentic-ai/sample-questions/index.html', import.meta.url)),
        samples: fileURLToPath(new URL('./sample-questions/index.html', import.meta.url)),
        practice: fileURLToPath(new URL('./practice/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['.tmp/**', 'e2e/**', 'tests/firebase.auth.test.ts', 'tests/firestore.*.test.ts', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**', 'src/data/csv/**', 'src/storage/**'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
