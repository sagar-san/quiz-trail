import { describe, expect, it } from 'vitest';
import { questions } from '../test/fixtures';
import { initialQuizState, quizReducer } from './quizReducer';
import { filterQuestions, selectCounts, toUserProgress } from './selectors';

const loaded = quizReducer(initialQuizState, { type: 'bankLoaded', questions, questionBankVersion: 'sha256:test' });

describe('quiz domain', () => {
  it('loads, answers, updates outcomes, and derives counts', () => {
    const wrong = quizReducer(loaded, { type: 'answerSubmitted', questionId: 'PMLE-0001', correct: false });
    const corrected = quizReducer(wrong, { type: 'answerSubmitted', questionId: 'PMLE-0001', correct: true });
    expect(selectCounts(corrected)).toEqual({ total: 3, attempted: 1, correct: 1, incorrect: 0, saved: 0, remaining: 2 });
    expect(toUserProgress(corrected).questionBankVersion).toBe('sha256:test');
  });

  it('toggles saved independently and filters each view', () => {
    let state = quizReducer(loaded, { type: 'answerSubmitted', questionId: 'PMLE-0001', correct: false });
    state = quizReducer(state, { type: 'savedToggled', questionId: 'PMLE-0002' });
    expect(filterQuestions(questions, state.progress, state.savedForLater, 'all')).toHaveLength(3);
    expect(filterQuestions(questions, state.progress, state.savedForLater, 'unanswered').map((q) => q.questionId)).toEqual(['PMLE-0002', 'PMLE-0003']);
    expect(filterQuestions(questions, state.progress, state.savedForLater, 'incorrect')[0].questionId).toBe('PMLE-0001');
    expect(filterQuestions(questions, state.progress, state.savedForLater, 'saved')[0].questionId).toBe('PMLE-0002');
    state = quizReducer(state, { type: 'savedToggled', questionId: 'PMLE-0002' });
    expect(state.savedForLater).toEqual([]);
  });

  it('keeps or selects a valid question on filter and navigation changes', () => {
    let state = quizReducer(loaded, { type: 'questionChanged', questionId: 'PMLE-0002' });
    state = quizReducer(state, { type: 'filterChanged', filter: 'unanswered' });
    expect(state.currentQuestionId).toBe('PMLE-0002');
    state = quizReducer(state, { type: 'answerSubmitted', questionId: 'PMLE-0002', correct: true });
    state = quizReducer(state, { type: 'filterChanged', filter: 'incorrect' });
    expect(state.currentQuestionId).toBeNull();
  });

  it('loads, saves, fails, and resets state', () => {
    const progress = { schemaVersion: 1 as const, questionBankVersion: 'old', progress: { 'PMLE-0002': false }, savedForLater: ['PMLE-0002'], lastQuestionId: 'PMLE-0002' };
    let state = quizReducer(loaded, { type: 'progressLoaded', progress, reconciliationNotice: 'Updated' });
    expect(state).toMatchObject({ dirty: false, currentQuestionId: 'PMLE-0002', reconciliationNotice: 'Updated' });
    state = quizReducer(state, { type: 'saveStarted' });
    expect(state.saveStatus).toBe('saving');
    state = quizReducer(state, { type: 'saveFailed', message: 'nope' });
    expect(state.saveError).toBe('nope');
    state = quizReducer(state, { type: 'saveSucceeded' });
    expect(state.dirty).toBe(false);
    state = quizReducer(state, { type: 'reset' });
    expect(state.progress).toEqual({});
  });
});
