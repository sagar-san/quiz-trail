import { describe, expect, it } from 'vitest';
import { questions } from '../../test/fixtures';
import { shuffleQuestions } from './loadQuestionBank';

describe('shuffleQuestions', () => {
  it('returns a shuffled copy without changing IDs or mutating the source', () => {
    const originalIds = questions.map((question) => question.questionId);
    const shuffled = shuffleQuestions(questions, () => 0);

    expect(shuffled.map((question) => question.questionId)).toEqual(['PMLE-0002', 'PMLE-0003', 'PMLE-0001']);
    expect(shuffled.map((question) => question.questionId).sort()).toEqual([...originalIds].sort());
    expect(questions.map((question) => question.questionId)).toEqual(originalIds);
  });
});
