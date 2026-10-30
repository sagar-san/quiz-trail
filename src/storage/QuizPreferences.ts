import { scopedKey, type CertificationId } from '../config/certifications';
import type { QuizFilter } from '../domain/types';

export interface QuizPreferences {
  loadFilter(): QuizFilter;
  saveFilter(filter: QuizFilter): void;
}

export const FILTER_PREFERENCE_KEY = 'quizTrail.filter.v1';
const validFilters: QuizFilter[] = ['all', 'unanswered', 'incorrect', 'saved'];

export class LocalStorageQuizPreferences implements QuizPreferences {
  private readonly key: string;
  constructor(private readonly storage: Storage = window.localStorage, certificationId: CertificationId = 'pmle') {
    this.key = scopedKey(FILTER_PREFERENCE_KEY, certificationId);
  }

  loadFilter(): QuizFilter {
    try {
      const value = this.storage.getItem(this.key);
      return validFilters.includes(value as QuizFilter) ? value as QuizFilter : 'unanswered';
    } catch {
      return 'unanswered';
    }
  }

  saveFilter(filter: QuizFilter): void {
    try {
      this.storage.setItem(this.key, filter);
    } catch {
      // A preference write failure should not interrupt studying.
    }
  }
}
