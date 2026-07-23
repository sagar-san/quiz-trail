import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { FeedbackStore } from './FeedbackStore';

export class FirestoreFeedbackStore implements FeedbackStore {
  constructor(private readonly firestore: Firestore) {}

  async submitFeedback(questionId: string, feedbackText: string, userId: string): Promise<void> {
    const docRef = doc(this.firestore, 'questionFeedback', questionId, 'submissions', userId);
    try {
      await setDoc(docRef, {
        text: feedbackText,
        submittedAt: serverTimestamp(),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Could not save feedback to Firestore. It may be disabled.',
        { cause: error }
      );
    }
  }
}
