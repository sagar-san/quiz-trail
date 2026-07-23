import type { QuizFilter } from '../domain/types';

export interface QuizPreferences {
  loadFilter(): QuizFilter;
  saveFilter(filter: QuizFilter): void;
}

export const FILTER_PREFERENCE_KEY = 'quizTrail.filter.v1';
const validFilters: QuizFilter[] = ['all', 'unanswered', 'incorrect', 'saved'];

export class LocalStorageQuizPreferences implements QuizPreferences {
  constructor(private readonly storage: Storage = window.localStorage) {}

  loadFilter(): QuizFilter {
    try {
      const value = this.storage.getItem(FILTER_PREFERENCE_KEY);
      return validFilters.includes(value as QuizFilter) ? value as QuizFilter : 'unanswered';
    } catch {
      return 'unanswered';
    }
  }

  saveFilter(filter: QuizFilter): void {
    try {
      this.storage.setItem(FILTER_PREFERENCE_KEY, filter);
    } catch {
      // A preference write failure should not interrupt studying.
    }
  }
}
