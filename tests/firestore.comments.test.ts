import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FirestoreCommentStore } from '../src/storage/FirestoreCommentStore';
import type { Reaction } from '../src/storage/CommentStore';
let env: RulesTestEnvironment;
const scope = { certificationId: 'pmle' as const, questionId: 'PMLE-0001' };
const databases = new Map<string, Firestore>();
const db = (uid = 'a') => {
  if (!databases.has(uid)) databases.set(uid, env.authenticatedContext(uid).firestore());
  return databases.get(uid)!;
};
const store = (uid = 'a') => new FirestoreCommentStore(db(uid));
const ref = (uid = 'a', id = 'c') => doc(db(uid), 'questionComments', id);
const vote = (uid = 'a', id = 'c') => doc(db(uid), 'commentReactions', uid, 'votes', id);
const create = () => store().createComment('a', scope, 'A comment', 'Learner', 'c');
const data = () => ({ ...scope, authorUid: 'a', authorName: 'Learner', text: 'A comment', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), likeCount: 0, dislikeCount: 0, score: 0, deleted: false });
async function enabled(value: boolean) {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'config/comments'), { enabled: value }); });
}
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'quiz-trail-comments-test', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => { await env.clearFirestore(); await enabled(true); });
afterAll(async () => env.cleanup());

describe('shared comments and paired reaction rules', () => {
  it('creates trimmed comments idempotently and preserves timestamps when editing', async () => {
    await store().createComment('a', scope, '  A comment  ', 'a@example.com', 'c');
    await store().createComment('a', scope, 'A comment', 'Learner', 'c');
    const original = (await getDoc(ref())).data()!;
    expect(original.authorName).toBe('Learner');
    await store().editComment('a', 'c', 'New text');
    expect((await getDoc(ref())).data()?.createdAt).toEqual(original.createdAt);
    await assertFails(updateDoc(ref('b'), { text: 'Stolen', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref('b'), { text: '', authorName: '', authorUid: null, deleted: true, updatedAt: serverTimestamp() }));
    await store().deleteComment('a', 'c');
    expect((await getDoc(ref())).data()).toMatchObject({ deleted: true, text: '', authorName: '', authorUid: null });
    await assertFails(updateDoc(ref(), { deleted: false }));
  });
  it('rejects malformed, spoofed, whitespace, oversized and wrong-scope writes', async () => {
    for (const changes of [{ text: '' }, { text: '   ' }, { text: '\n' }, { text: ' untrimmed' }, { text: 'x'.repeat(2001) }, { authorUid: 'b' }, { authorName: '' }, { extra: true }, { score: 1 }, { likeCount: 1, score: 1 }, { questionId: 'PAA-0001' }, { certificationId: 'unknown' }, { createdAt: Timestamp.fromMillis(1) }]) {
      await assertFails(setDoc(ref(), { ...data(), ...changes }));
    }
    await expect(store().createComment('a', scope, ' ', 'Learner', 'c')).rejects.toThrow();
  });
  it('enforces all six transitions, repeated desired states, and simultaneous users within rule budgets', async () => {
    await create();
    for (const desired of ['like', null, 'dislike', null, 'like', 'dislike', 'like'] as Reaction[]) {
      const expected = { likeCount: Number(desired === 'like'), dislikeCount: Number(desired === 'dislike'), score: desired === 'like' ? 1 : desired === 'dislike' ? -1 : 0 };
      await expect(store().setReaction('a', 'c', desired)).resolves.toMatchObject(expected);
      await expect(store().setReaction('a', 'c', desired)).resolves.toMatchObject(expected);
      expect((await getDoc(ref())).data()).toMatchObject(expected);
    }
    await Promise.all(['b', 'c', 'd'].map((uid) => store(uid).setReaction(uid, 'c', 'like')));
    expect((await getDoc(ref())).data()).toMatchObject({ likeCount: 4, dislikeCount: 0, score: 4 });
  });
  it('rejects aggregate-only, vote-only, forged, negative, cross-user and content-changing writes', async () => {
    await create();
    await assertFails(updateDoc(ref(), { likeCount: 1, score: 1 }));
    await assertFails(setDoc(vote(), { value: 'like', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db('b'), 'commentReactions/a/votes/c'), { value: 'like', updatedAt: serverTimestamp() }));
    for (const changes of [{ likeCount: 2, score: 2 }, { dislikeCount: -1, score: 2 }, { score: 99 }, { text: 'Changed' }, { authorUid: 'b' }, { deleted: true }]) {
      const batch = writeBatch(db());
      batch.set(vote(), { value: 'like', updatedAt: serverTimestamp() });
      batch.update(ref(), { likeCount: 1, score: 1, ...changes });
      await assertFails(batch.commit());
    }
    await store().setReaction('a', 'c', 'like');
    await assertFails(deleteDoc(vote()));
    await assertFails(getDoc(doc(db('b'), 'commentReactions/a/votes/c')));
    await assertFails(getDocs(collection(db('b'), 'commentReactions/a/votes')));
  });
  it('rejects votes on missing, newly created and deleted comments but permits tombstone removal', async () => {
    await assertFails(setDoc(vote(), { value: 'like', updatedAt: serverTimestamp() }));
    const batch = writeBatch(db());
    batch.set(ref(), data()); batch.set(vote(), { value: 'like', updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
    await create(); await store('b').setReaction('b', 'c', 'dislike');
    await store().deleteComment('a', 'c');
    await assertFails(store().setReaction('a', 'c', 'like'));
    await store('b').setReaction('b', 'c', null);
    expect((await getDoc(ref())).data()).toMatchObject({ likeCount: 0, dislikeCount: 0, score: 0 });
  });
  it('requires authentication and the verified Google preview owner for PAA', async () => {
    await create();
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'questionComments/c')));
    const paa = { certificationId: 'agentic-ai' as const, questionId: 'PAA-0001' };
    await assertFails(store().createComment('a', paa, 'Private', 'Learner', 'private'));
    const owner = env.authenticatedContext('owner', { email: 'ssanghani@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore();
    await new FirestoreCommentStore(owner).createComment('owner', paa, 'Private', 'Learner', 'private');
    await expect(new FirestoreCommentStore(owner).listPage('owner', paa)).resolves.toMatchObject({ items: [{ text: 'Private' }] });
    await assertFails(getDoc(ref('a', 'private')));
    await assertFails(store().listPage('a', paa));
    // Cleanup remains possible after preview authorization is lost.
    await store('owner').deleteUserCommentData('owner');
    expect((await getDoc(doc(owner, 'questionComments/private'))).data()?.deleted).toBe(true);
  });
  it('paginates ties by full-precision timestamp and ID with the last displayed cursor', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (let i = 0; i < 24; i++) {
        await setDoc(doc(ctx.firestore(), 'questionComments', `c${String(i).padStart(2, '0')}`), {
          ...data(), createdAt: new Timestamp(100, i < 12 ? 1 : 2), updatedAt: new Timestamp(100, i < 12 ? 1 : 2),
          likeCount: i === 23 ? 1 : 0, dislikeCount: i === 0 ? 1 : 0, score: i === 23 ? 1 : i === 0 ? -1 : 0,
        });
      }
    });
    const first = await store().listPage('a', scope);
    const second = await store().listPage('a', scope, first.nextCursor);
    const third = await store().listPage('a', scope, second.nextCursor);
    expect(first.items.map((x) => x.id)).toEqual(['c23', ...Array.from({ length: 9 }, (_, i) => `c${String(i + 1).padStart(2, '0')}`)]);
    expect(second.items[0].id).toBe('c10');
    expect(third.items.map((x) => x.id)).toEqual(['c20', 'c21', 'c22', 'c00']);
    expect([first.hasNext, second.hasNext, third.hasNext]).toEqual([true, true, false]);
    expect((await store().listPage('a', scope)).items).toEqual(first.items);
    await store().deleteUserCommentData('a');
    expect((await store().listPage('a', scope)).items).toHaveLength(0);
  });
  it('rejects creation combined with a deletion marker and rejects unauthorized preview identities', async () => {
    const batch = writeBatch(db());
    batch.set(doc(db(), 'commentAccounts/a'), { deleting: true });
    batch.set(ref(), data());
    await assertFails(batch.commit());
    for (const token of [
      { email: 'ssanghani@gmail.com', email_verified: false, firebase: { sign_in_provider: 'google.com' } },
      { email: 'ssanghani@gmail.com', email_verified: true, firebase: { sign_in_provider: 'password' } },
    ]) {
      const restricted = env.authenticatedContext('restricted', token).firestore();
      await assertFails(new FirestoreCommentStore(restricted).createComment('restricted',
        { certificationId: 'agentic-ai', questionId: 'PAA-0001' }, 'Private', 'Learner', 'private'));
    }
  });
  it('keeps removal available when disabled and makes interrupted cleanup resumable while blocking other tabs', async () => {
    await create();
    await store('b').createComment('b', scope, 'Other author', 'Bob', 'other');
    await store().setReaction('a', 'other', 'like');
    await store('b').setReaction('b', 'c', 'like');
    await enabled(false);
    await assertFails(store().createComment('a', scope, 'Blocked', 'Learner', 'blocked'));
    await assertFails(store().editComment('a', 'c', 'Blocked'));
    await assertFails(store().setReaction('a', 'c', 'like'));
    // Simulate interruption after marking deletion but before cleaning any data.
    await setDoc(doc(db(), 'commentAccounts/a'), { deleting: true });
    await enabled(true);
    await assertFails(store().createComment('a', scope, 'Blocked', 'Learner', 'blocked'));
    await assertFails(store().editComment('a', 'c', 'Blocked'));
    await assertFails(store().setReaction('a', 'c', 'like'));
    await enabled(false);
    await store().deleteUserCommentData('a'); await store().deleteUserCommentData('a');
    expect((await getDoc(ref())).data()).toMatchObject({ deleted: true, authorUid: null });
    expect((await getDoc(ref('a', 'other'))).data()?.likeCount).toBe(0);
    expect((await getDocs(collection(db(), 'commentReactions/a/votes'))).empty).toBe(true);
    await store('b').setReaction('b', 'c', null);
  });
});
