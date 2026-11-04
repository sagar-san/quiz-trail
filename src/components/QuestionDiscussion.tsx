import { useEffect, useRef, useState } from 'react';
import { publicCommentName, type CommentCursor, type CommentPage, type CommentScope, type CommentStore, type QuestionComment, type Reaction } from '../storage/CommentStore';
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
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<CommentPage | null>(null);
  const [cursors, setCursors] = useState<(CommentCursor | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
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

  async function load(index: number, stack = cursors) {
    if (!store || !user) return;
    const version = ++request.current;
    setLoading(true); setLoadError(false);
    try {
      const result = await store.listPage(user.uid, scope, stack[index]);
      if (!active.current || version !== request.current) return;
      setPage(result); setPageIndex(index); setCursors(stack);
    } catch {
      if (active.current && version === request.current) setLoadError(true);
    } finally {
      if (active.current && version === request.current) setLoading(false);
    }
  }
  async function mutate(id: string, action: () => Promise<void>) {
    if (locked) return;
    setPending(id); setError('');
    try { await trackWrite(action()); }
    catch { if (active.current) setError('Could not save this change. Your draft is kept. Try again, or reload the discussion to check access and availability.'); }
    finally { if (active.current) setPending(null); }
  }
  async function post() {
    if (!store || !user) return;
    const submission = attempt ?? { id: crypto.randomUUID(), text: draft.trim() };
    setAttempt(submission);
    await mutate('composer', async () => {
      await store.createComment(user.uid, scope, submission.text, name, submission.id);
      if (!active.current) return;
      setAttempt(null); setDraft('');
      await load(0, [undefined]);
    });
  }
  async function react(comment: QuestionComment, desired: Reaction) {
    if (!store || !user) return;
    await mutate(comment.id, async () => {
      const result = await store.setReaction(user.uid, comment.id, desired);
      if (active.current) setPage((current) => current && ({ ...current,
        items: current.items.map((item) => item.id === comment.id ? { ...item, ...result } : item) }));
    });
  }
  if (!cloud) return <p className="discussion-note">Shared comments are available when using a signed-in cloud account.</p>;
  if (!user) return <p className="discussion-note"><button type="button" className="text-button" disabled={busy} onClick={onSignIn}>Sign in</button> to read and join the question discussion.</p>;
  if (!store) return null;
  return <section className="question-discussion" aria-label="Question discussion">
    <button type="button" className="secondary-button" aria-expanded={open} onClick={() => {
      setOpen(!open); if (!open && !page) void load(0);
    }}>{open ? 'Hide discussion' : 'Open discussion'}</button>
    {open && <>
      <h3>Discussion</h3>
      <p>Comments are visible to other signed-in learners. Names are display labels, not verified identities.</p>
      <p className="discussion-note">Sorted by likes minus dislikes, then oldest first. Rankings can change between pages.</p>
      {loading && <p role="status">Loading comments…</p>}
      {loadError && <p role="alert">Comments could not be loaded. <button type="button" onClick={() => void load(pageIndex)}>Try again</button></p>}
      {page?.deletionPending && <p role="alert">Account deletion was started. New comments and reactions are paused. Open Settings and retry Delete account to finish cleanup.</p>}
      {page && !page.writesEnabled && <p>New comments, edits, and reactions are temporarily paused. You can still delete your comments or remove a reaction.</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => void load(pageIndex)}>Reload discussion</button></p>}
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
                await store.editComment(user.uid, comment.id, editText);
                if (!active.current) return;
                setEditing(null); await load(pageIndex);
              });
            }}>
              <label htmlFor={`edit-${comment.id}`}>Edit comment</label>
              <textarea id={`edit-${comment.id}`} rows={3} maxLength={2000} value={editText} disabled={writesDisabled} onChange={(event) => setEditText(event.target.value)} />
              <div className="discussion-controls"><button disabled={writesDisabled || !editText.trim()}>Save comment</button><button type="button" disabled={locked} onClick={() => setEditing(null)}>Cancel</button></div>
            </form> : <p className="comment-text">{comment.text}</p>}
            <div className="discussion-controls">
              {(['like', 'dislike'] as const).map((value) => <button key={value} type="button" aria-pressed={comment.reaction === value}
                disabled={locked || loading || (comment.reaction !== value && writesDisabled)}
                onClick={() => void react(comment, comment.reaction === value ? null : value)}>
                {value === 'like' ? `Like (${comment.likeCount})` : `Dislike (${comment.dislikeCount})`}
              </button>)}
              <span>Score: {comment.score}</span>
              {comment.authorUid === user.uid && <>
                <button type="button" disabled={writesDisabled} onClick={() => { setEditing(comment.id); setEditText(comment.text); }}>Edit</button>
                <button type="button" disabled={locked} onClick={() => {
                  if (window.confirm('Delete this comment? Its text and author name will be removed.')) void mutate(comment.id, async () => {
                    await store.deleteComment(user.uid, comment.id);
                    if (active.current) await load(pageIndex);
                  });
                }}>Delete</button>
              </>}
            </div>
          </li>)}
        </ol>
        <nav className="discussion-controls" aria-label="Discussion pages">
          <button type="button" disabled={loading || locked || pageIndex === 0} onClick={() => void load(pageIndex - 1)}>Previous comments</button>
          <span>Page {pageIndex + 1}</span>
          <button type="button" disabled={loading || locked || !page.hasNext} onClick={() => void load(pageIndex + 1, [...cursors.slice(0, pageIndex + 1), page.nextCursor])}>Next comments</button>
        </nav>
        {!page.hasNext && page.items.length > 0 && <p className="discussion-note">End of comments.</p>}
      </>}
    </>}
  </section>;
}
