import type { QuizQuestion, UserProgress } from '../domain/types';

export function reconcileProgress(progress: UserProgress, questions: QuizQuestion[], version: string) {
  const known = new Set(questions.map((question) => question.questionId));
  const validProgress = Object.fromEntries(Object.entries(progress.progress).filter(([id]) => known.has(id)));
  const validSaved = progress.savedForLater.filter((id) => known.has(id));
  const lastQuestionId = progress.lastQuestionId && known.has(progress.lastQuestionId) ? progress.lastQuestionId : null;
  const removed = Object.keys(progress.progress).length - Object.keys(validProgress).length
    + progress.savedForLater.length - validSaved.length
    + (progress.lastQuestionId && !lastQuestionId ? 1 : 0);
  return {
    progress: { ...progress, questionBankVersion: version, progress: validProgress, savedForLater: validSaved, lastQuestionId },
    notice: removed
      ? `${removed} saved reference${removed === 1 ? ' no longer exists' : 's no longer exist'} in this question bank and ${removed === 1 ? 'was' : 'were'} removed.`
      : undefined,
  };
}
