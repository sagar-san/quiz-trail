import {
  collection, doc, documentId, increment, getDocFromServer, getDocsFromServer, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, where,
  type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { commentText, publicCommentName, type CommentCursor, type CommentPage, type CommentScope, type CommentStore, type Reaction } from './CommentStore';

export class FirestoreCommentStore implements CommentStore {
  constructor(private readonly db: Firestore) {}
  async listPage(uid: string, scope: CommentScope, cursor?: CommentCursor): Promise<CommentPage> {
    const [snapshot, config, account] = await Promise.all([
      getDocsFromServer(query(collection(this.db, 'questionComments'),
        where('certificationId', '==', scope.certificationId), where('questionId', '==', scope.questionId),
        where('deleted', '==', false), orderBy('score', 'desc'), orderBy('createdAt', 'asc'), orderBy(documentId(), 'asc'),
        ...(cursor ? [startAfter(cursor.token as QueryDocumentSnapshot)] : []), limit(11))),
      getDocFromServer(doc(this.db, 'config/comments')),
      getDocFromServer(doc(this.db, 'commentAccounts', uid)),
    ]);
    const displayed = snapshot.docs.slice(0, 10);
    const items = await Promise.all(displayed.map(async (item) => {
      const data = item.data();
      const vote = await getDocFromServer(doc(this.db, 'commentReactions', uid, 'votes', item.id));
      return { id: item.id, authorUid: data.authorUid, authorName: data.authorName, text: data.text,
        createdAt: data.createdAt.toMillis(), edited: !data.createdAt.isEqual(data.updatedAt),
        likeCount: data.likeCount, dislikeCount: data.dislikeCount, score: data.score,
        reaction: (vote.data()?.value ?? null) as Reaction };
    }));
    return { items, hasNext: snapshot.size > 10,
      nextCursor: displayed.length ? { token: displayed[displayed.length - 1] } : undefined,
      writesEnabled: config.data()?.enabled === true, deletionPending: account.data()?.deleting === true };
  }
  async createComment(uid: string, scope: CommentScope, text: string, authorName: string, id: string) {
    const value = commentText(text);
    const ref = doc(this.db, 'questionComments', id);
    await runTransaction(this.db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) {
        const data = existing.data();
        if (data.authorUid === uid && data.text === value && data.certificationId === scope.certificationId && data.questionId === scope.questionId) return;
        throw new Error('This submission was already used. Reload the discussion before posting again.');
      }
      tx.set(ref, { ...scope, authorUid: uid, authorName: publicCommentName(authorName), text: value,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), likeCount: 0, dislikeCount: 0, score: 0, deleted: false });
    });
  }
  async editComment(uid: string, id: string, text: string) {
    const value = commentText(text);
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'questionComments', id);
      const snapshot = await tx.get(ref);
      if (snapshot.data()?.authorUid !== uid) throw new Error('You can only edit your own comments.');
      tx.update(ref, { text: value, updatedAt: serverTimestamp() });
    });
  }
  async deleteComment(uid: string, id: string) {
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'questionComments', id);
      const snapshot = await tx.get(ref);
      if (snapshot.data()?.deleted) return;
      if (snapshot.data()?.authorUid !== uid) throw new Error('You can only delete your own comments.');
      tx.update(ref, { text: '', authorName: '', authorUid: null, deleted: true, updatedAt: serverTimestamp() });
    });
  }
  async setReaction(uid: string, id: string, desired: Reaction) {
    return runTransaction(this.db, async (tx) => {
      const commentRef = doc(this.db, 'questionComments', id);
      const voteRef = doc(this.db, 'commentReactions', uid, 'votes', id);
      const [comment, vote] = await Promise.all([tx.get(commentRef), tx.get(voteRef)]);
      if (!comment.exists()) throw new Error('This comment is no longer available.');
      const data = comment.data();
      const old = vote.data()?.value ?? null;
      const likeCount = data.likeCount + Number(desired === 'like') - Number(old === 'like');
      const dislikeCount = data.dislikeCount + Number(desired === 'dislike') - Number(old === 'dislike');
      if (old !== desired) {
        // Transforms keep the rules' delta check valid even when another writer
        // commits after our read; the transaction still retries on a version conflict.
        const likes = Number(desired === 'like') - Number(old === 'like');
        const dislikes = Number(desired === 'dislike') - Number(old === 'dislike');
        tx.update(commentRef, { likeCount: increment(likes), dislikeCount: increment(dislikes), score: increment(likes - dislikes) });
        if (desired === null) tx.delete(voteRef);
        else tx.set(voteRef, { value: desired, updatedAt: serverTimestamp() });
      }
      return { likeCount, dislikeCount, score: likeCount - dislikeCount, reaction: desired };
    });
  }
  async deleteUserCommentData(uid: string) {
    await setDoc(doc(this.db, 'commentAccounts', uid), { deleting: true });
    // Each successful mutation removes its document from the next bounded query.
    // A retry starts at the remaining data; the marker also blocks other tabs.
    for (;;) {
      const page = await getDocsFromServer(query(collection(this.db, 'questionComments'), where('authorUid', '==', uid), limit(20)));
      if (page.empty) break;
      for (const item of page.docs) await this.deleteComment(uid, item.id);
    }
    for (;;) {
      const page = await getDocsFromServer(query(collection(this.db, 'commentReactions', uid, 'votes'), limit(20)));
      if (page.empty) break;
      for (const item of page.docs) await this.setReaction(uid, item.id, null);
    }
  }
}
