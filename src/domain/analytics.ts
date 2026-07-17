import type { Difficulty, QuizQuestion } from './types';

export const MINIMUM_SAMPLE_SIZE = 5;

export interface CategoryStat {
  label: string;
  total: number;
  answered: number;
  correct: number;
  missed: number;
  accuracy: number | null;
  coverage: number;
}

export interface LearningAnalytics {
  overall: CategoryStat;
  byExamSection: CategoryStat[];
  byObjective: CategoryStat[];
  byTopic: CategoryStat[];
  byDifficulty: CategoryStat[];
  strengths: CategoryStat[];
  weakAreas: CategoryStat[];
  reviewQueue: {
    incorrect: number;
    saved: number;
    unanswered: number;
    outdated: number;
  };
}

const percent = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;

function toStat(label: string, questions: QuizQuestion[], progress: Record<string, boolean>): CategoryStat {
  const answeredQuestions = questions.filter((question) => question.questionId in progress);
  const correct = answeredQuestions.filter((question) => progress[question.questionId]).length;
  return {
    label,
    total: questions.length,
    answered: answeredQuestions.length,
    correct,
    missed: answeredQuestions.length - correct,
    accuracy: answeredQuestions.length ? percent(correct, answeredQuestions.length) : null,
    coverage: percent(answeredQuestions.length, questions.length),
  };
}

function groupBy(
  questions: QuizQuestion[],
  progress: Record<string, boolean>,
  categories: (question: QuizQuestion) => string[],
): CategoryStat[] {
  const grouped = new Map<string, QuizQuestion[]>();
  for (const question of questions) {
    for (const category of new Set(categories(question))) {
      grouped.set(category, [...(grouped.get(category) ?? []), question]);
    }
  }
  return [...grouped.entries()]
    .map(([label, categoryQuestions]) => toStat(label, categoryQuestions, progress))
    .sort((a, b) => b.answered - a.answered || a.label.localeCompare(b.label));
}

export function buildLearningAnalytics(
  questions: QuizQuestion[],
  progress: Record<string, boolean>,
  savedForLater: string[],
): LearningAnalytics {
  const byExamSection = groupBy(questions, progress, (question) => [question.examSection]);
  const byObjective = groupBy(questions, progress, (question) => question.examObjectives);
  const byTopic = groupBy(questions, progress, (question) => question.topics);
  const difficultyOrder: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  const byDifficulty = difficultyOrder.map((difficulty) =>
    toStat(difficulty, questions.filter((question) => question.difficulty === difficulty), progress));
  const eligibleSections = byExamSection.filter((stat) => stat.answered >= MINIMUM_SAMPLE_SIZE);

  return {
    overall: toStat('Overall', questions, progress),
    byExamSection,
    byObjective,
    byTopic,
    byDifficulty,
    strengths: eligibleSections.filter((stat) => (stat.accuracy ?? 0) >= 80),
    weakAreas: eligibleSections.filter((stat) => (stat.accuracy ?? 100) < 60),
    reviewQueue: {
      incorrect: Object.values(progress).filter((outcome) => !outcome).length,
      saved: new Set(savedForLater).size,
      unanswered: questions.filter((question) => !(question.questionId in progress)).length,
      outdated: questions.filter((question) => question.isOutdated && question.questionId in progress).length,
    },
  };
}
