import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { UserProgress } from '../src/domain/types';
import { FirestoreProgressStore } from '../src/storage/FirestoreProgressStore';

const projectId = 'quiz-trail-progress-test';
let environment: RulesTestEnvironment;

const progress: UserProgress = {
  schemaVersion: 1,
  questionBankVersion: 'sha256:test',
  progress: { 'PMLE-0001': true, 'PMLE-0002': false },
  savedForLater: ['PMLE-0002'],
  lastQuestionId: 'PMLE-0002',
};

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

const storeFor = (userId: string) => new FirestoreProgressStore(environment.authenticatedContext(userId).firestore());

describe('FirestoreProgressStore', () => {
  it('loads a new user, saves revision one, and resumes from another store instance', async () => {
    const firstDevice = storeFor('user-a');
    expect(await firstDevice.load('user-a')).toBeNull();

    await firstDevice.saveAnswer('PMLE-0001', true, 'sha256:test', 'user-a');
    await firstDevice.saveAnswer('PMLE-0002', false, 'sha256:test', 'user-a');
    await firstDevice.saveBookmark('PMLE-0002', true, 'sha256:test', 'user-a');

    const secondDevice = storeFor('user-a');
    expect(await secondDevice.load('user-a')).toEqual(progress);
    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(3);
  });

  it('increments revisions after each successful save', async () => {
    const store = storeFor('user-a');
    await store.saveAnswer('PMLE-0001', true, 'sha256:test', 'user-a');
    await store.saveBookmark('PMLE-0002', true, 'sha256:test', 'user-a');

    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(2);
    expect(snapshot.data()?.savedForLater).toEqual(['PMLE-0002']);
  });

  it('merges targeted saves from different devices without losing unrelated answers', async () => {
    const firstDevice = storeFor('user-a');
    const secondDevice = storeFor('user-a');
    await firstDevice.saveAnswer('PMLE-0001', true, 'sha256:test', 'user-a');
    await secondDevice.saveAnswer('PMLE-0002', false, 'sha256:test', 'user-a');
    expect(await storeFor('user-a').load('user-a')).toEqual({ ...progress, savedForLater: [] });
  });

  it('resets only the requested authenticated user and can save fresh progress afterward', async () => {
    const userA = storeFor('user-a');
    const userB = storeFor('user-b');
    await userA.saveAnswer('PMLE-0001', true, 'sha256:test', 'user-a');
    await userB.saveAnswer('PMLE-0001', true, 'sha256:test', 'user-b');

    await userA.reset('user-a');

    expect(await storeFor('user-a').load('user-a')).toBeNull();
    expect((await storeFor('user-b').load('user-b'))?.progress).toEqual({ 'PMLE-0001': true });
    await userA.saveAnswer('PMLE-0002', false, 'sha256:test', 'user-a');
    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(1);
  });

  it('rejects malformed cloud documents and requires a UID', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'userProgress/user-a'), {
        ...progress,
        schemaVersion: 2,
        revision: 1,
        updatedAt: serverTimestamp(),
      });
    });
    const store = storeFor('user-a');

    await expect(store.load('user-a')).rejects.toThrow('incompatible or damaged');
    await expect(store.load()).rejects.toThrow('signed-in user is required');
    await expect(storeFor('user-b').saveAnswer('PMLE-0001', true, 'test')).rejects.toThrow('signed-in user is required');
  });
});
