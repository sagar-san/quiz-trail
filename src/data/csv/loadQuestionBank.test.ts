import { afterEach, describe, expect, it, vi } from 'vitest';
import { questions } from '../../test/fixtures';
import { hashCsv, shuffleQuestions } from './loadQuestionBank';

afterEach(() => vi.unstubAllGlobals());

describe('shuffleQuestions', () => {
  it('returns a shuffled copy without changing IDs or mutating the source', () => {
    const originalIds = questions.map((question) => question.questionId);
    const shuffled = shuffleQuestions(questions, () => 0);

    expect(shuffled.map((question) => question.questionId)).toEqual(['PMLE-0002', 'PMLE-0003', 'PMLE-0001']);
    expect(shuffled.map((question) => question.questionId).sort()).toEqual([...originalIds].sort());
    expect(questions.map((question) => question.questionId)).toEqual(originalIds);
  });

  it('uses a deterministic fallback when Web Crypto is unavailable on local HTTP', async () => {
    vi.stubGlobal('crypto', {});
    const bytes = new TextEncoder().encode('question bank');
    expect(await hashCsv(bytes)).toBe(await hashCsv(bytes));
    expect(await hashCsv(bytes)).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });
});
