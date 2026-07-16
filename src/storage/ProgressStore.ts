import type { UserProgress } from '../domain/types';

export interface ProgressStore {
  load(userId?: string): Promise<UserProgress | null>;
  save(progress: UserProgress, userId?: string): Promise<void>;
  reset(userId?: string): Promise<void>;
}

export class ProgressStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressStoreError';
  }
}
