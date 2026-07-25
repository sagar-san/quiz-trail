import type { QuizFilter, QuizQuestion, QuizState } from './types';

export function filterQuestions(
  questions: QuizQuestion[],
  progress: Record<string, boolean>,
  savedForLater: string[],
  filter: QuizFilter,
): QuizQuestion[] {
  const saved = new Set(savedForLater);
  if (filter === 'unanswered') return questions.filter((q) => !(q.questionId in progress));
  if (filter === 'incorrect') return questions.filter((q) => progress[q.questionId] === false);
  if (filter === 'saved') return questions.filter((q) => saved.has(q.questionId));
  return questions;
}

export const selectFilteredQuestions = (state: QuizState) =>
  filterQuestions(state.questions, state.progress, state.savedForLater, state.filter);

export function selectCounts(state: QuizState) {
  const outcomes = Object.values(state.progress);
  const correct = outcomes.filter(Boolean).length;
  const incorrect = outcomes.length - correct;
  return {
    total: state.questions.length,
    attempted: outcomes.length,
    correct,
    incorrect,
    saved: state.savedForLater.length,
    remaining: state.questions.length - outcomes.length,
  };
}

export function chooseVisibleQuestion(state: QuizState, filter: QuizFilter): string | null {
  const visible = filterQuestions(state.questions, state.progress, state.savedForLater, filter);
  return visible.some((q) => q.questionId === state.currentQuestionId)
    ? state.currentQuestionId
    : (visible[0]?.questionId ?? null);
}
