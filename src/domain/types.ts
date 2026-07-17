export const choiceKeys = ['A', 'B', 'C', 'D', 'E'] as const;
export type ChoiceKey = (typeof choiceKeys)[number];
export type QuestionType = 'single_choice' | 'multiple_choice';
export type QuizFilter = 'all' | 'unanswered' | 'incorrect' | 'saved' | 'outdated';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuizQuestion {
  questionId: string;
  questionType: QuestionType;
  prompt: string;
  options: Array<{ key: ChoiceKey; text: string }>;
  correctAnswers: ChoiceKey[];
  explanation: string;
  referenceUrl?: string;
  chatgptVerified?: boolean;
  examSection: string;
  examObjectives: string[];
  topics: string[];
  difficulty: Difficulty;
  questionSource: string;
  reviewStatus: string;
  isOutdated: boolean;
  terminologyStatus: string;
  terminologyNotes: string;
}

export interface UserProgress {
  schemaVersion: 1;
  questionBankVersion: string;
  progress: Record<string, boolean>;
  savedForLater: string[];
  lastQuestionId: string | null;
}

export interface QuizState {
  questions: QuizQuestion[];
  questionBankVersion: string;
  progress: Record<string, boolean>;
  savedForLater: string[];
  currentQuestionId: string | null;
  filter: QuizFilter;
  dirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed';
  saveError: string | null;
  reconciliationNotice: string | null;
}

export type QuizAction =
  | { type: 'bankLoaded'; questions: QuizQuestion[]; questionBankVersion: string }
  | { type: 'answerSubmitted'; questionId: string; correct: boolean }
  | { type: 'savedToggled'; questionId: string }
  | { type: 'filterChanged'; filter: QuizFilter }
  | { type: 'questionChanged'; questionId: string }
  | { type: 'progressLoaded'; progress: UserProgress; reconciliationNotice?: string }
  | { type: 'saveStarted' }
  | { type: 'saveSucceeded' }
  | { type: 'saveFailed'; message: string }
  | { type: 'reset' };

export const createEmptyProgress = (questionBankVersion: string): UserProgress => ({
  schemaVersion: 1,
  questionBankVersion,
  progress: {},
  savedForLater: [],
  lastQuestionId: null,
});
