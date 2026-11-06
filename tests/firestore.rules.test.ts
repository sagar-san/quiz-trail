import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const projectId = 'quiz-trail-rules-test';
let environment: RulesTestEnvironment;

const validProgress = () => ({
  schemaVersion: 1,
  questionBankVersion: 'sha256:test',
  progress: { 'PMLE-0001': true },
  savedForLater: ['PMLE-0002'],
  lastQuestionId: 'PMLE-0002',
  revision: 1,
  updatedAt: serverTimestamp(),
});

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

beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

async function seedProgress(userId: string) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `userProgress/${userId}`), validProgress());
  });
}

describe('Firestore progress ownership rules', () => {
  it('denies unauthenticated reads, creates, updates, and deletes', async () => {
    const progress = doc(environment.unauthenticatedContext().firestore(), 'userProgress/user-a');

    await assertFails(getDoc(progress));
    await assertFails(setDoc(progress, validProgress()));
    await seedProgress('user-a');
    await assertFails(setDoc(progress, { ...validProgress(), revision: 2 }));
    await assertFails(deleteDoc(progress));
  });

  it('allows a user to create, read, update, and delete only their own document', async () => {
    const userA = environment.authenticatedContext('user-a').firestore();
    const ownProgress = doc(userA, 'userProgress/user-a');

    await assertSucceeds(setDoc(ownProgress, validProgress()));
    await assertSucceeds(getDoc(ownProgress));
    await assertSucceeds(setDoc(ownProgress, { ...validProgress(), revision: 2 }));
    await assertSucceeds(deleteDoc(ownProgress));
  });

  it('denies cross-user access', async () => {
    const userA = environment.authenticatedContext('user-a').firestore();
    const userBProgress = doc(userA, 'userProgress/user-b');

    await assertFails(getDoc(userBProgress));
    await assertFails(setDoc(userBProgress, validProgress()));
    await seedProgress('user-b');
    await assertFails(deleteDoc(userBProgress));
  });

  it('denies unexpected fields and invalid schema versions', async () => {
    const ownProgress = doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a');

    await assertFails(setDoc(ownProgress, { ...validProgress(), unexpected: true }));
    await assertFails(setDoc(ownProgress, { ...validProgress(), schemaVersion: 2 }));
  });
});

const googleClaims = { email: 'learner@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
it('allows any verified Google learner to get PAA but denies guests, invalid identities, listing and client writes', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'privateQuestionBanks/agentic-ai'), { format: 'aes-gcm-v1', asset: 'test-only' });
  });
  for (const email of ['ssanghani@gmail.com', 'learner@example.com']) {
    const learner = environment.authenticatedContext(email, { ...googleClaims, email }).firestore();
    await assertSucceeds(getDoc(doc(learner, 'privateQuestionBanks/agentic-ai')));
    await assertFails(getDocs(collection(learner, 'privateQuestionBanks')));
    await assertFails(setDoc(doc(learner, 'privateQuestionBanks/agentic-ai'), { asset: 'changed' }));
    await assertFails(deleteDoc(doc(learner, 'privateQuestionBanks/agentic-ai')));
    await assertFails(getDoc(doc(learner, 'privateQuestionBanks/unknown')));
  }
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('restricted'), environment.authenticatedContext('restricted', { ...googleClaims, email_verified: false }), environment.authenticatedContext('restricted', { ...googleClaims, firebase: { sign_in_provider: 'password' } })]) {
    await assertFails(getDoc(doc(context.firestore(), 'privateQuestionBanks/agentic-ai')));
    await assertFails(setDoc(doc(context.firestore(), 'userProgress/restricted/certifications/agentic-ai'), validProgress()));
  }
});
it('allows PAA progress for ordinary Google learners while enforcing ownership, revisions and known certifications', async () => {
  const learner = environment.authenticatedContext('learner', googleClaims).firestore();
  const other = environment.authenticatedContext('other', { ...googleClaims, email: 'other@example.com' }).firestore();
  const own = doc(learner, 'userProgress/learner/certifications/agentic-ai');
  const foreign = doc(other, 'userProgress/learner/certifications/agentic-ai');
  await assertSucceeds(setDoc(own, validProgress()));
  await assertSucceeds(getDoc(own));
  await assertFails(setDoc(own, validProgress()));
  await assertSucceeds(setDoc(own, { ...validProgress(), revision: 2 }));
  await assertFails(getDoc(foreign));
  await assertFails(setDoc(foreign, { ...validProgress(), revision: 3 }));
  await assertFails(deleteDoc(foreign));
  await assertFails(setDoc(doc(learner, 'userProgress/learner/certifications/unknown'), validProgress()));
  await assertSucceeds(deleteDoc(own));
});
