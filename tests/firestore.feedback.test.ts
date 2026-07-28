import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FirestoreFeedbackStore } from '../src/storage/FirestoreFeedbackStore';

const projectId = 'quiz-trail-feedback-test';
let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'config/feedback'), { enabled: true });
  });
});
afterAll(async () => environment.cleanup());

const feedbackRef = (viewerId: string, ownerId = viewerId) => doc(
  environment.authenticatedContext(viewerId).firestore(),
  'questionFeedback',
  'PMLE-0001',
  'submissions',
  ownerId,
);

describe('Firestore question feedback', () => {
  it('stores and replaces one feedback document per user and question', async () => {
    const firestore = environment.authenticatedContext('user-a').firestore();
    const store = new FirestoreFeedbackStore(firestore);

    await store.submitFeedback('PMLE-0001', 'The answer needs clarification.', 'user-a');
    await store.submitFeedback('PMLE-0001', 'The reference needs clarification.', 'user-a');

    const snapshot = await getDoc(feedbackRef('user-a'));
    expect(snapshot.data()?.text).toBe('The reference needs clarification.');
    expect(snapshot.data()?.submittedAt).toBeDefined();
    expect(snapshot.data()).not.toHaveProperty('userId');
  });

  it('loads the learner\'s existing feedback and returns null when none exists', async () => {
    const firestore = environment.authenticatedContext('user-a').firestore();
    const store = new FirestoreFeedbackStore(firestore);

    await expect(store.loadFeedback('PMLE-0001', 'user-a')).resolves.toBeNull();
    await store.submitFeedback('PMLE-0001', 'The reference needs clarification.', 'user-a');
    await expect(store.loadFeedback('PMLE-0001', 'user-a')).resolves.toBe(
      'The reference needs clarification.',
    );
  });

  it('allows direct reads only for the document owner and denies learner listing', async () => {
    await assertSucceeds(setDoc(feedbackRef('user-a'), {
      text: 'The answer needs clarification.',
      submittedAt: serverTimestamp(),
    }));

    await assertSucceeds(getDoc(feedbackRef('user-a')));
    await assertFails(getDoc(feedbackRef('user-b', 'user-a')));
    await assertFails(getDocs(collection(
      environment.authenticatedContext('user-a').firestore(),
      'questionFeedback',
      'PMLE-0001',
      'submissions',
    )));
    await assertFails(getDoc(doc(
      environment.unauthenticatedContext().firestore(),
      'questionFeedback',
      'PMLE-0001',
      'submissions',
      'user-a',
    )));
  });

  it('rejects cross-user writes and malformed feedback', async () => {
    await assertFails(setDoc(feedbackRef('user-a', 'user-b'), {
      text: 'Cross-user write.',
      submittedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(feedbackRef('user-a'), {
      text: '',
      submittedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(feedbackRef('user-a'), {
      text: 'x'.repeat(1001),
      submittedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(feedbackRef('user-a'), {
      text: 'Unexpected field.',
      submittedAt: serverTimestamp(),
      userId: 'user-a',
    }));
    await assertFails(setDoc(feedbackRef('user-a'), {
      text: 'Client timestamp.',
      submittedAt: new Date().toISOString(),
    }));
  });

  it('blocks writes when feedback is disabled', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'config/feedback'), { enabled: false });
    });

    const store = new FirestoreFeedbackStore(
      environment.authenticatedContext('user-a').firestore(),
    );
    await expect(
      store.submitFeedback('PMLE-0001', 'This should be blocked.', 'user-a'),
    ).rejects.toThrow();
  });
});
