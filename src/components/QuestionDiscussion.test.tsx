import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionDiscussion } from './QuestionDiscussion';
import type { CommentPage, CommentStore } from '../storage/CommentStore';
const empty: CommentPage = { items: [], hasNext: false, writesEnabled: true, deletionPending: false };
const comment = { id: 'c', authorUid: 'a', authorName: 'Alice', text: 'Hello', createdAt: 1, edited: false, likeCount: 0, dislikeCount: 0, score: 0, reaction: null };
const makeStore = () => ({ listPage: vi.fn().mockResolvedValue(empty), createComment: vi.fn().mockResolvedValue(undefined), editComment: vi.fn().mockResolvedValue(undefined), deleteComment: vi.fn().mockResolvedValue(undefined), setReaction: vi.fn(), deleteUserCommentData: vi.fn() });
const props = (store: CommentStore) => ({ store, user: { uid: 'a', displayName: 'Alice' }, scope: { certificationId: 'pmle' as const, questionId: 'PMLE-0001' }, cloud: true, onSignIn: vi.fn(), trackWrite: (write: Promise<void>) => write });
const open = () => userEvent.click(screen.getByRole('button', { name: 'Open discussion' }));
describe('QuestionDiscussion', () => {
  it('makes no guest or local requests and offers guest sign-in', async () => {
    const store = makeStore(); const p = props(store);
    const view = render(<QuestionDiscussion {...p} user={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(p.onSignIn).toHaveBeenCalledOnce();
    view.rerender(<QuestionDiscussion {...p} cloud={false} />);
    expect(store.listPage).not.toHaveBeenCalled();
  });
  it('loads lazily, retries load errors, and handles next, previous and end-of-list', async () => {
    const store = makeStore();
    const cursor = { token: 'opaque' };
    store.listPage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...empty, items: [comment], hasNext: true, nextCursor: cursor }).mockResolvedValueOnce({ ...empty, items: [{ ...comment, id: 'd', text: 'Second page' }] }).mockResolvedValueOnce({ ...empty, items: [comment], hasNext: true, nextCursor: cursor });
    render(<QuestionDiscussion {...props(store)} />);
    expect(store.listPage).not.toHaveBeenCalled(); await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Next comments' }));
    expect(await screen.findByText('Second page')).toBeVisible();
    expect(store.listPage).toHaveBeenLastCalledWith('a', props(store).scope, cursor);
    expect(screen.getByRole('button', { name: 'Next comments' })).toBeDisabled();
    expect(screen.getByText('End of comments.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Previous comments' }));
    expect(await screen.findByText('Hello')).toBeVisible();
    expect(store.listPage).toHaveBeenLastCalledWith('a', props(store).scope, undefined);
  });
  it('retains the exact submission ID and draft after an ambiguous failure, using a safe public name', async () => {
    const store = makeStore(); store.createComment.mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce(undefined);
    render(<QuestionDiscussion {...props(store)} user={{ uid: 'a', displayName: 'private@example.com' }} />);
    await open(); await userEvent.type(await screen.findByLabelText('Post as Learner'), 'A draft');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is kept');
    expect(screen.getByLabelText('Post as Learner')).toHaveValue('A draft');
    await userEvent.click(screen.getByRole('button', { name: 'Retry comment' }));
    await waitFor(() => expect(store.createComment).toHaveBeenCalledTimes(2));
    expect(store.createComment.mock.calls[0]).toEqual(store.createComment.mock.calls[1]);
    await waitFor(() => expect(screen.getByLabelText('Post as Learner')).toHaveValue(''));
  });
  it.each(['question', 'account'])('ignores outstanding reads when switching %s', async (kind) => {
    const store = makeStore(); let finish!: (page: CommentPage) => void;
    store.listPage.mockReturnValueOnce(new Promise<CommentPage>((resolve) => { finish = resolve; }));
    const p = props(store); const view = render(<QuestionDiscussion {...p} />); await open();
    view.rerender(<QuestionDiscussion {...p} user={kind === 'account' ? { uid: 'b', displayName: 'Bob' } : p.user}
      scope={kind === 'question' ? { ...p.scope, questionId: 'PMLE-0002' } : p.scope} />);
    await act(async () => finish({ ...empty, items: [comment] }));
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open discussion' })).toBeVisible();
  });
  it('updates reactions without refetching or reordering, and disables controls while pending', async () => {
    const store = makeStore(); store.listPage.mockResolvedValue({ ...empty, items: [comment] });
    let finish!: (value: unknown) => void; store.setReaction.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<QuestionDiscussion {...props(store)} />); await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Like (0)' }));
    expect(screen.getByRole('button', { name: 'Dislike (0)' })).toBeDisabled();
    await act(async () => finish({ likeCount: 1, dislikeCount: 0, score: 1, reaction: 'like' }));
    expect(screen.getByRole('button', { name: 'Like (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(store.listPage).toHaveBeenCalledTimes(1);
  });
  it('allows removal while writes are paused and explains deletion recovery', async () => {
    const store = makeStore(); store.listPage.mockResolvedValue({ ...empty, writesEnabled: false, deletionPending: true, items: [{ ...comment, reaction: 'like', likeCount: 1, score: 1 }] });
    render(<QuestionDiscussion {...props(store)} />); await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('retry Delete account');
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Like (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Dislike (0)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });
});
