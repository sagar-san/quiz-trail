import { chooseVisibleQuestion } from './selectors';
import type { QuizAction, QuizState } from './types';

export const initialQuizState: QuizState = {
  questions: [],
  questionBankVersion: '',
  progress: {},
  savedForLater: [],
  currentQuestionId: null,
  filter: 'all',
  dirty: false,
  saveStatus: 'idle',
  saveError: null,
  reconciliationNotice: null,
};

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'bankLoaded':
      return {
        ...state,
        questions: action.questions,
        questionBankVersion: action.questionBankVersion,
        currentQuestionId: action.questions[0]?.questionId ?? null,
      };
    case 'answerSubmitted':
      return {
        ...state,
        progress: { ...state.progress, [action.questionId]: action.correct },
        currentQuestionId: action.questionId,
        dirty: true,
        saveStatus: 'idle',
      };
    case 'savedToggled': {
      const isSaved = state.savedForLater.includes(action.questionId);
      return {
        ...state,
        savedForLater: isSaved
          ? state.savedForLater.filter((id) => id !== action.questionId)
          : [...state.savedForLater, action.questionId],
        dirty: true,
        saveStatus: 'idle',
      };
    }
    case 'filterChanged':
      return { ...state, filter: action.filter, currentQuestionId: chooseVisibleQuestion(state, action.filter) };
    case 'questionChanged':
      return { ...state, currentQuestionId: action.questionId, dirty: true, saveStatus: 'idle' };
    case 'progressLoaded': {
      const loaded = {
        ...state,
        progress: action.progress.progress,
        savedForLater: action.progress.savedForLater,
        currentQuestionId: action.progress.lastQuestionId,
        dirty: false,
        saveStatus: 'saved' as const,
        reconciliationNotice: action.reconciliationNotice ?? null,
      };
      return { ...loaded, currentQuestionId: chooseVisibleQuestion(loaded, loaded.filter) };
    }
    case 'saveStarted':
      return { ...state, saveStatus: 'saving', saveError: null };
    case 'saveSucceeded':
      return { ...state, dirty: false, saveStatus: 'saved', saveError: null };
    case 'saveFailed':
      return { ...state, saveStatus: 'failed', saveError: action.message };
    case 'reset':
      return {
        ...state,
        progress: {},
        savedForLater: [],
        filter: 'unanswered',
        currentQuestionId: state.questions[0]?.questionId ?? null,
        dirty: false,
        saveStatus: 'saved',
        saveError: null,
        reconciliationNotice: null,
      };
  }
}
