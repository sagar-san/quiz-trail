import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
