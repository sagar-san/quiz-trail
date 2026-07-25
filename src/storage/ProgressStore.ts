import type { UserProgress } from '../domain/types';

export interface ProgressStore {
  load(userId?: string): Promise<UserProgress | null>;
  saveAnswer(questionId: string, correct: boolean, questionBankVersion: string, userId?: string): Promise<void>;
  saveBookmark(questionId: string, saved: boolean, questionBankVersion: string, userId?: string): Promise<void>;
  reset(userId?: string): Promise<void>;
}

export class ProgressStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressStoreError';
  }
}
