import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { questionBankEncryptionKey } from '../quiz-trail-question-bank/scripts/encryption.ts';

const questionBankKeyVersion = [...questionBankEncryptionKey]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')
  .slice(0, 12);

export default defineConfig({
  plugins: [react()],
  define: {
    __QUESTION_BANK_ENCRYPTION_KEY__: JSON.stringify([...questionBankEncryptionKey]),
    __QUESTION_BANK_KEY_VERSION__: JSON.stringify(questionBankKeyVersion),
  },
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
