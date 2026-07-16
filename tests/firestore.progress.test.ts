import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { UserProgress } from '../src/domain/types';
import { FirestoreProgressStore, StaleProgressError } from '../src/storage/FirestoreProgressStore';

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

    await firstDevice.save(progress, 'user-a');

    const secondDevice = storeFor('user-a');
    expect(await secondDevice.load('user-a')).toEqual(progress);
    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(1);
  });

  it('increments revisions after each successful save', async () => {
    const store = storeFor('user-a');
    await store.load('user-a');
    await store.save(progress, 'user-a');
    await store.save({ ...progress, savedForLater: [] }, 'user-a');

    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(2);
    expect(snapshot.data()?.savedForLater).toEqual([]);
  });

  it('rejects an older device after another device advances the revision', async () => {
    const firstDevice = storeFor('user-a');
    await firstDevice.load('user-a');
    await firstDevice.save(progress, 'user-a');

    const secondDevice = storeFor('user-a');
    await secondDevice.load('user-a');
    await firstDevice.save({ ...progress, savedForLater: [] }, 'user-a');

    await expect(secondDevice.save({ ...progress, progress: {} }, 'user-a')).rejects.toBeInstanceOf(StaleProgressError);
    expect(await storeFor('user-a').load('user-a')).toEqual({ ...progress, savedForLater: [] });
  });

  it('resets only the requested authenticated user and can save fresh progress afterward', async () => {
    const userA = storeFor('user-a');
    const userB = storeFor('user-b');
    await userA.load('user-a');
    await userB.load('user-b');
    await userA.save(progress, 'user-a');
    await userB.save(progress, 'user-b');

    await userA.reset('user-a');

    expect(await storeFor('user-a').load('user-a')).toBeNull();
    expect(await storeFor('user-b').load('user-b')).toEqual(progress);
    await userA.save(progress, 'user-a');
    const snapshot = await getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'userProgress/user-a'));
    expect(snapshot.data()?.revision).toBe(1);
  });

  it('rejects malformed cloud documents and requires a UID and completed load', async () => {
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
    await expect(storeFor('user-b').save(progress, 'user-b')).rejects.toThrow('finish loading');
  });
});
