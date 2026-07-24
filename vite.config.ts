import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { parseQuestionBank } from './src/data/csv/parseQuestionBank';
import {
  questionBankEncryptionKey,
  questionBankFormatMagic,
} from './src/data/csv/questionBankEncryption';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const defaultQuestionBankPath = '../quiz-trail-question-bank/questions.csv';

function resolveQuestionBankPath(): string {
  const configuredPath = process.env.QUESTION_BANK_PATH ?? defaultQuestionBankPath;
  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(repositoryRoot, configuredPath);
}

async function readValidatedQuestionBank(): Promise<Uint8Array> {
  const bytes = new Uint8Array(await readFile(resolveQuestionBankPath()));
  const csv = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  parseQuestionBank(csv);
  return bytes;
}

function encryptQuestionBank(plaintext: Uint8Array): Uint8Array {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(questionBankEncryptionKey),
    initializationVector,
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([
    questionBankFormatMagic,
    initializationVector,
    ciphertext,
    cipher.getAuthTag(),
  ]);
}

function questionBankPlugin(): Plugin {
  return {
    name: 'quiz-trail-question-bank',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (pathname !== '/data/questions.csv') {
          next();
          return;
        }

        try {
          const bytes = await readValidatedQuestionBank();
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/csv; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(bytes);
        } catch (error) {
          server.config.logger.error(
            `Unable to load the external question bank: ${error instanceof Error ? error.message : String(error)}`,
          );
          response.statusCode = 500;
          response.end('The development question bank could not be loaded.');
        }
      });
    },
    async generateBundle() {
      const plaintext = await readValidatedQuestionBank();
      this.emitFile({
        type: 'asset',
        fileName: 'data/questions.bin',
        source: encryptQuestionBank(plaintext),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), questionBankPlugin()],
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        faq: fileURLToPath(new URL('./faq/index.html', import.meta.url)),
        samples: fileURLToPath(new URL('./sample-questions/index.html', import.meta.url)),
        practice: fileURLToPath(new URL('./practice/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'tests/firebase.auth.test.ts', 'tests/firestore.*.test.ts', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**', 'src/data/csv/**', 'src/storage/**'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
