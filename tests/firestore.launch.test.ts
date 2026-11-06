import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderFirestoreRules } from '../scripts/release';
import { FirestoreCommentStore } from '../src/storage/FirestoreCommentStore';

for (const agenticAiPublic of [false, true]) {
  describe(`PAA release authorization: ${agenticAiPublic}`, () => {
    let env: RulesTestEnvironment;
    const claims = { email: 'learner@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
    const progress = () => ({ schemaVersion: 1, questionBankVersion: 'test', progress: { 'PAA-0001': true }, savedForLater: [], lastQuestionId: 'PAA-0001', revision: 1, updatedAt: serverTimestamp() });
    beforeAll(async () => {
      env = await initializeTestEnvironment({ projectId: `quiz-trail-launch-${agenticAiPublic}`, firestore: { host: '127.0.0.1', port: 8080, rules: renderFirestoreRules(readFileSync('firestore.rules', 'utf8'), { agenticAiPublic }) } });
    });
    beforeEach(async () => {
      await env.clearFirestore();
      await env.withSecurityRulesDisabled(async ctx => {
        await setDoc(doc(ctx.firestore(), 'privateQuestionBanks/agentic-ai'), { asset: 'synthetic' });
        await setDoc(doc(ctx.firestore(), 'config/comments'), { enabled: true });
      });
    });
    afterAll(async () => env.cleanup());
    it('preserves owner access and gates ordinary learners across bank, progress and discussion', async () => {
      for (const email of ['ssanghani@gmail.com', 'learner@example.com']) {
        const db = env.authenticatedContext(email, { ...claims, email }).firestore();
        const check = agenticAiPublic || email === 'ssanghani@gmail.com' ? assertSucceeds : assertFails;
        await check(getDoc(doc(db, 'privateQuestionBanks/agentic-ai')));
        await check(setDoc(doc(db, `userProgress/${email}/certifications/agentic-ai`), progress()));
        const comments = new FirestoreCommentStore(db);
        await check(comments.createComment(email, { certificationId: 'agentic-ai', questionId: 'PAA-0001' }, 'Synthetic discussion', 'Learner', email));
        if (agenticAiPublic || email === 'ssanghani@gmail.com') {
          await comments.setReaction(email, email, 'like');
          expect((await comments.listPage(email, { certificationId: 'agentic-ai', questionId: 'PAA-0001' })).items.length).toBeGreaterThan(0);
        }
        await assertFails(getDocs(collection(db, 'privateQuestionBanks')));
        await assertFails(setDoc(doc(db, 'privateQuestionBanks/agentic-ai'), { asset: 'changed' }));
        await assertFails(getDoc(doc(db, 'userProgress/another-user/certifications/agentic-ai')));
      }
    });
    it('rejects guests, unverified Google accounts and non-Google accounts in both modes', async () => {
      for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext('restricted', { ...claims, email_verified: false }), env.authenticatedContext('restricted', { ...claims, firebase: { sign_in_provider: 'password' } })]) {
        const db = ctx.firestore();
        await assertFails(getDoc(doc(db, 'privateQuestionBanks/agentic-ai')));
        await assertFails(setDoc(doc(db, 'userProgress/restricted/certifications/agentic-ai'), progress()));
      }
    });
  });
}
