import { scopedKey, type CertificationId } from '../config/certifications';
import { z } from 'zod';
import type { UserProgress } from '../domain/types';
import { ProgressStoreError, type ProgressStore } from './ProgressStore';

export const LOCAL_PROGRESS_KEY = 'quizTrail.progress.v1';

const schema = z.object({
  schemaVersion: z.literal(1),
  questionBankVersion: z.string(),
  progress: z.record(z.string(), z.boolean()),
  savedForLater: z.array(z.string()),
  lastQuestionId: z.string().nullable(),
});

export class LocalStorageProgressStore implements ProgressStore {
  private readonly key: string;
  constructor(private readonly storage: Storage = window.localStorage, certificationId: CertificationId = 'pmle') {
    this.key = scopedKey(LOCAL_PROGRESS_KEY, certificationId);
  }

  async load(): Promise<UserProgress | null> {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const result = schema.safeParse(JSON.parse(raw));
      if (!result.success) throw new ProgressStoreError('Saved progress is incompatible or damaged. Reset it to continue.');
      return result.data;
    } catch (error) {
      if (error instanceof ProgressStoreError) throw error;
      throw new ProgressStoreError('Saved progress could not be read. Your browser storage may be unavailable.');
    }
  }

  private readForUpdate(questionBankVersion: string): UserProgress {
    const raw = this.storage.getItem(this.key);
    if (!raw) return {
      schemaVersion: 1,
      questionBankVersion,
      progress: {},
      savedForLater: [],
      lastQuestionId: null,
    };
    return schema.parse(JSON.parse(raw));
  }

  async saveAnswer(questionId: string, correct: boolean, questionBankVersion: string): Promise<void> {
    try {
      const current = this.readForUpdate(questionBankVersion);
      this.storage.setItem(this.key, JSON.stringify({
        ...current,
        questionBankVersion,
        progress: { ...current.progress, [questionId]: correct },
        lastQuestionId: questionId,
      }));
    } catch {
      throw new ProgressStoreError('Your answer could not be saved. Check browser storage and available space.');
    }
  }

  async saveBookmark(questionId: string, saved: boolean, questionBankVersion: string): Promise<void> {
    try {
      const current = this.readForUpdate(questionBankVersion);
      const bookmarks = new Set(current.savedForLater);
      if (saved) bookmarks.add(questionId);
      else bookmarks.delete(questionId);
      this.storage.setItem(this.key, JSON.stringify({
        ...current,
        questionBankVersion,
        savedForLater: [...bookmarks],
      }));
    } catch {
      throw new ProgressStoreError('Your bookmark could not be saved. Check browser storage and available space.');
    }
  }

  async reset(): Promise<void> {
    try {
      this.storage.removeItem(this.key);
    } catch {
      throw new ProgressStoreError('Saved progress could not be cleared. Check browser storage permissions.');
    }
  }
}
