import { useEffect, useRef, useState } from 'react';
import { publicCommentName, type CommentCursor, type CommentPage, type CommentScope, type CommentStore, type QuestionComment, type Reaction } from '../storage/CommentStore';
import { withDeadline } from '../storage/commentRequest';
import type { AuthUser } from '../auth/AuthService';

interface Props {
  store?: CommentStore; user: AuthUser | null; scope: CommentScope;
  cloud: boolean; busy?: boolean; onSignIn: () => void;
  trackWrite: (write: Promise<void>) => Promise<void>;
}
export function QuestionDiscussion(props: Props) {
  return <DiscussionSession key={`${props.user?.uid}:${props.scope.certificationId}:${props.scope.questionId}`} {...props} />;
}
function DiscussionSession({ store, user, scope, cloud, busy, onSignIn, trackWrite }: Props) {
  const [page, setPage] = useState<CommentPage | null>(null);
  const [cursors, setCursors] = useState<(CommentCursor | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(cloud && store && user));
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [attempt, setAttempt] = useState<{ id: string; text: string } | null>(null);
  const active = useRef(true);
  const request = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const name = publicCommentName(user?.displayName);
  const locked = busy || pending !== null;
  const writesDisabled = locked || !page?.writesEnabled || page.deletionPending;

  const uid = user?.uid;
  const { certificationId, questionId } = scope;
  async function load(index: number, stack: (CommentCursor | undefined)[]) {
    if (!store || !uid) return;
    const version = ++request.current;
    setLoading(true); setLoadError(false);
    try {
      const result = await withDeadline(store.listPage(uid, { certificationId, questionId }, stack[index]));
      if (!active.current || version !== request.current) return;
      setPage(result); setPageIndex(index); setCursors(stack);
    } catch {
      if (active.current && version === request.current) setLoadError(true);
    } finally {
      if (active.current && version === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!cloud || !store || !uid) return;
    let cancelled = false;
    const version = ++request.current;
    void withDeadline(store.listPage(uid, { certificationId, questionId }))
      .then((result) => { if (!cancelled && version === request.current) setPage(result); })
      .catch(() => { if (!cancelled && version === request.current) setLoadError(true); })
      .finally(() => { if (!cancelled && version === request.current) setLoading(false); });
    return () => { cancelled = true; };
  }, [cloud, store, uid, certificationId, questionId]);
  async function mutate(id: string, action: () => Promise<void>) {
    if (locked) return;
    setPending(id); setError('');
    try { await trackWrite(action()); }
    catch (failure) { if (active.current) setError(failure instanceof Error && failure.message.startsWith('This request') ? failure.message : 'Could not save this change. Your draft is kept. Try again, or reload the discussion to check access and availability.'); }
    finally { if (active.current) setPending(null); }
  }
  async function post() {
    if (!store || !user) return;
    const submission = attempt ?? { id: crypto.randomUUID(), text: draft.trim() };
    setAttempt(submission);
    await mutate('composer', async () => {
      await withDeadline(store.createComment(user.uid, scope, submission.text, name, submission.id));
      if (!active.current) return;
      setAttempt(null); setDraft('');
      await load(0, [undefined]);
    });
  }
  async function react(comment: QuestionComment, desired: Reaction) {
    if (!store || !user) return;
    await mutate(comment.id, async () => {
      const result = await withDeadline(store.setReaction(user.uid, comment.id, desired));
      if (active.current) setPage((current) => current && ({ ...current,
        items: current.items.map((item) => item.id === comment.id ? { ...item, ...result } : item) }));
    });
  }
  if (!cloud) return <p className="discussion-note">Shared comments are available when using a signed-in cloud account.</p>;
  if (!user) return <p className="discussion-note"><button type="button" className="text-button" disabled={busy} onClick={onSignIn}>Sign in</button> to read and join the question discussion.</p>;
  if (!store) return null;
  return <section className="question-discussion" aria-label="Question discussion">
      <h3>Discussion</h3>
      {loading && <p role="status">Loading comments…</p>}
      {loadError && <p role="alert">Comments could not be loaded. <button type="button" onClick={() => void load(pageIndex, cursors)}>Try again</button></p>}
      {page?.deletionPending && <p role="alert">Account deletion was started. New comments and reactions are paused. Open Settings and retry Delete account to finish cleanup.</p>}
      {page && !page.writesEnabled && <p>New comments, edits, and reactions are temporarily paused. You can still delete your comments or remove a reaction.</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => void load(pageIndex, cursors)}>Reload discussion</button></p>}
      {page && <>
        <form onSubmit={(event) => { event.preventDefault(); void post(); }}>
          <label htmlFor="comment-draft">Post as {name}</label>
          <textarea id="comment-draft" rows={3} maxLength={2000} value={draft}
            disabled={writesDisabled || attempt !== null} onChange={(event) => setDraft(event.target.value)} />
          <div className="discussion-controls"><span>{draft.length}/2000 characters</span>
            <button type="submit" className="primary-button" disabled={writesDisabled || !draft.trim()}>
              {pending === 'composer' ? 'Posting…' : attempt ? 'Retry comment' : 'Post comment'}
            </button></div>
          {attempt && !pending && <p>Retry sends the same submission to avoid duplicate comments.</p>}
        </form>
        {!loading && page.items.length === 0 && <p>No comments on this page yet.</p>}
        <ol className="discussion-list">
          {page.items.map((comment) => <li key={comment.id}>
            <div className="discussion-byline"><strong>{comment.authorName}</strong> <time dateTime={new Date(comment.createdAt).toISOString()}>{new Date(comment.createdAt).toLocaleDateString()}</time> {comment.edited && <span>Edited</span>}</div>
            {editing === comment.id ? <form onSubmit={(event) => {
              event.preventDefault(); void mutate(comment.id, async () => {
                await withDeadline(store.editComment(user.uid, comment.id, editText));
                if (!active.current) return;
                setEditing(null); await load(pageIndex, cursors);
              });
            }}>
              <label htmlFor={`edit-${comment.id}`}>Edit comment</label>
              <textarea id={`edit-${comment.id}`} rows={3} maxLength={2000} value={editText} disabled={writesDisabled} onChange={(event) => setEditText(event.target.value)} />
              <div className="discussion-controls"><button disabled={writesDisabled || !editText.trim()}>Save comment</button><button type="button" disabled={locked} onClick={() => setEditing(null)}>Cancel</button></div>
            </form> : <p className="comment-text">{comment.text}</p>}
            <div className="discussion-controls">
              {(['like', 'dislike'] as const).map((value) => <button key={value} type="button" className="comment-reaction" aria-pressed={comment.reaction === value}
                aria-label={value === 'like' ? `Like (${comment.likeCount})` : `Dislike (${comment.dislikeCount})`}
                title={comment.reaction === value ? 'Remove reaction' : value === 'like' ? 'Like' : 'Dislike'}
                disabled={locked || loading || (comment.reaction !== value && writesDisabled)}
                onClick={() => void react(comment, comment.reaction === value ? null : value)}>
                <svg className={value === 'dislike' ? 'thumb-down' : undefined} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 10v11H3V10h4Z M7 10l5-7a2 2 0 0 1 2 2v5h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7" />
                </svg>
                <span aria-hidden="true">{value === 'like' ? comment.likeCount : comment.dislikeCount}</span>
              </button>)}
              {comment.authorUid === user.uid && <>
                <button type="button" disabled={writesDisabled} onClick={() => { setEditing(comment.id); setEditText(comment.text); }}>Edit</button>
                <button type="button" disabled={locked} onClick={() => {
                  if (window.confirm('Delete this comment? Its text and author name will be removed.')) void mutate(comment.id, async () => {
                    await withDeadline(store.deleteComment(user.uid, comment.id));
                    if (active.current) await load(pageIndex, cursors);
                  });
                }}>Delete</button>
              </>}
            </div>
          </li>)}
        </ol>
        <nav className="discussion-controls" aria-label="Discussion pages">
          <button type="button" disabled={loading || locked || pageIndex === 0} onClick={() => void load(pageIndex - 1, cursors)}>Previous comments</button>
          <span>Page {pageIndex + 1}</span>
          <button type="button" disabled={loading || locked || !page.hasNext} onClick={() => void load(pageIndex + 1, [...cursors.slice(0, pageIndex + 1), page.nextCursor])}>Next comments</button>
        </nav>
        {!page.hasNext && page.items.length > 0 && <p className="discussion-note">End of comments.</p>}
      </>}
      <p className="discussion-disclosure">Comments are visible to other signed-in learners. Names are display labels, not verified identities.</p>
  </section>;
}
