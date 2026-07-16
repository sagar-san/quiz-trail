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

export class StaleProgressError extends ProgressStoreError {
  constructor() {
    super('Your progress was updated in another tab or device. Reload before saving so newer progress is not overwritten.');
    this.name = 'StaleProgressError';
  }
}

function requireUserId(userId?: string): string {
  if (!userId) throw new ProgressStoreError('A signed-in user is required to access cloud progress.');
  return userId;
}

export class FirestoreProgressStore implements ProgressStore {
  private readonly loadedRevisions = new Map<string, number>();

  constructor(private readonly firestore: Firestore) {}

  async load(userId?: string): Promise<UserProgress | null> {
    const uid = requireUserId(userId);
    try {
      const snapshot = await getDoc(doc(this.firestore, 'userProgress', uid));
      if (!snapshot.exists()) {
        this.loadedRevisions.set(uid, 0);
        return null;
      }

      const result = progressDocumentSchema.safeParse(snapshot.data());
      if (!result.success) {
        throw new ProgressStoreError('Cloud progress is incompatible or damaged. Reset it or contact the site owner.');
      }
      const { revision } = result.data;
      this.loadedRevisions.set(uid, revision);
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

  async save(progress: UserProgress, userId?: string): Promise<void> {
    const uid = requireUserId(userId);
    const expectedRevision = this.loadedRevisions.get(uid);
    if (expectedRevision === undefined) {
      throw new ProgressStoreError('Cloud progress must finish loading before it can be saved.');
    }

    try {
      const nextRevision = await runTransaction(this.firestore, async (transaction) => {
        const reference = doc(this.firestore, 'userProgress', uid);
        const snapshot = await transaction.get(reference);
        const currentRevision = snapshot.exists() ? snapshot.data().revision : 0;
        if (!Number.isInteger(currentRevision) || currentRevision !== expectedRevision) {
          throw new StaleProgressError();
        }

        const revision = expectedRevision + 1;
        transaction.set(reference, {
          ...progress,
          revision,
          updatedAt: serverTimestamp(),
        });
        return revision;
      });
      this.loadedRevisions.set(uid, nextRevision);
    } catch (error) {
      if (error instanceof ProgressStoreError) throw error;
      throw new ProgressStoreError('Cloud progress could not be saved. Check your connection and try again.');
    }
  }

  async reset(userId?: string): Promise<void> {
    const uid = requireUserId(userId);
    try {
      await deleteDoc(doc(this.firestore, 'userProgress', uid));
      this.loadedRevisions.set(uid, 0);
    } catch {
      throw new ProgressStoreError('Cloud progress could not be reset. Check your connection and try again.');
    }
  }
}
