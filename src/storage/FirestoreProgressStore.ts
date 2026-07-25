import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { z } from 'zod';
import type { UserProgress } from '../domain/types';
import { ProgressStoreError, type ProgressStore } from './ProgressStore';

const progressDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  questionBankVersion: z.string(),
  progress: z.record(z.string(), z.boolean()),
  savedForLater: z.array(z.string()),
  lastQuestionId: z.string().nullable(),
  revision: z.number().int().positive(),
  updatedAt: z.unknown(),
}).strict();

function requireUserId(userId?: string): string {
  if (!userId) throw new ProgressStoreError('A signed-in user is required to access cloud progress.');
  return userId;
}

export class FirestoreProgressStore implements ProgressStore {
  constructor(private readonly firestore: Firestore) {}

  async load(userId?: string): Promise<UserProgress | null> {
    const uid = requireUserId(userId);
    try {
      const snapshot = await getDoc(doc(this.firestore, 'userProgress', uid));
      if (!snapshot.exists()) return null;

      const result = progressDocumentSchema.safeParse(snapshot.data());
      if (!result.success) {
        throw new ProgressStoreError('Cloud progress is incompatible or damaged. Reset it or contact the site owner.');
      }
      return {
        schemaVersion: result.data.schemaVersion,
        questionBankVersion: result.data.questionBankVersion,
        progress: result.data.progress,
        savedForLater: result.data.savedForLater,
        lastQuestionId: result.data.lastQuestionId,
      };
    } catch (error) {
      if (error instanceof ProgressStoreError) throw error;
      throw new ProgressStoreError('Cloud progress could not be loaded. Check your connection and try again.');
    }
  }

  private async update(
    questionBankVersion: string,
    userId: string | undefined,
    mutate: (progress: UserProgress) => UserProgress,
  ): Promise<void> {
    const uid = requireUserId(userId);
    await runTransaction(this.firestore, async (transaction) => {
      const reference = doc(this.firestore, 'userProgress', uid);
      const snapshot = await transaction.get(reference);
      const existing = snapshot.exists() ? progressDocumentSchema.safeParse(snapshot.data()) : null;
      if (existing && !existing.success) {
        throw new ProgressStoreError('Cloud progress is incompatible or damaged. Reset it or contact the site owner.');
      }
      const current: UserProgress = existing?.success ? {
        schemaVersion: existing.data.schemaVersion,
        questionBankVersion: existing.data.questionBankVersion,
        progress: existing.data.progress,
        savedForLater: existing.data.savedForLater,
        lastQuestionId: existing.data.lastQuestionId,
      } : {
        schemaVersion: 1,
        questionBankVersion,
        progress: {},
        savedForLater: [],
        lastQuestionId: null,
      };
      transaction.set(reference, {
        ...mutate(current),
        revision: existing?.success ? existing.data.revision + 1 : 1,
        updatedAt: serverTimestamp(),
      });
    });
  }

  async saveAnswer(questionId: string, correct: boolean, questionBankVersion: string, userId?: string): Promise<void> {
    try {
      await this.update(questionBankVersion, userId, (current) => ({
        ...current,
        questionBankVersion,
        progress: { ...current.progress, [questionId]: correct },
        lastQuestionId: questionId,
      }));
    } catch (error) {
      if (error instanceof ProgressStoreError) throw error;
      throw new ProgressStoreError('Your answer could not be saved. Check your connection and try again.');
    }
  }

  async saveBookmark(questionId: string, saved: boolean, questionBankVersion: string, userId?: string): Promise<void> {
    try {
      await this.update(questionBankVersion, userId, (current) => {
        const bookmarks = new Set(current.savedForLater);
        if (saved) bookmarks.add(questionId);
        else bookmarks.delete(questionId);
        return { ...current, questionBankVersion, savedForLater: [...bookmarks] };
      });
    } catch (error) {
      if (error instanceof ProgressStoreError) throw error;
      throw new ProgressStoreError('Your bookmark could not be saved. Check your connection and try again.');
    }
  }

  async reset(userId?: string): Promise<void> {
    const uid = requireUserId(userId);
    try {
      await deleteDoc(doc(this.firestore, 'userProgress', uid));
    } catch {
      throw new ProgressStoreError('Cloud progress could not be reset. Check your connection and try again.');
    }
  }
}
