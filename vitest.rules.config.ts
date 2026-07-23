import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/firestore.rules.test.ts',
      'tests/firestore.progress.test.ts',
      'tests/firestore.feedback.test.ts',
    ],
    fileParallelism: false,
  },
});
