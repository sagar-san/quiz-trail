import { certifications } from '../config/certifications';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService, AuthStateListener, AuthUser } from '../auth/AuthService';
import type { UserProgress } from '../domain/types';
import type { CommentStore } from '../storage/CommentStore';
import type { ProgressStore } from '../storage/ProgressStore';
import type { QuizPreferences } from '../storage/QuizPreferences';
import { questions } from '../test/fixtures';
import { App } from './App';

beforeEach(() => {
  window.history.replaceState({}, '', '/practice/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

const loader = async () => ({ questions, version: 'sha256:test' });
const expandedQuestions = Array.from({ length: 12 }, (_, index) => ({
  ...questions[index % questions.length],
  questionId: `PMLE-${String(index + 1).padStart(4, '0')}`,
  prompt: `Question ${index + 1}`,
}));
const expandedLoader = async () => ({ questions: expandedQuestions, version: 'sha256:expanded-test' });
const memoryStore = (saved: UserProgress | null = null): ProgressStore & {
  saveAnswer: ReturnType<typeof vi.fn>;
  saveBookmark: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} => ({
  load: vi.fn().mockResolvedValue(saved),
  saveAnswer: vi.fn().mockResolvedValue(undefined),
  saveBookmark: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
});

class TestAuthService implements AuthService {
  readonly mode = 'firebase' as const;
  private listener: AuthStateListener = () => undefined;
  signIn = vi.fn(async () => this.listener({ uid: 'user-a', displayName: 'Alice', email: 'alice@example.com', photoUrl: 'https://example.com/alice.jpg' }));
  signOut = vi.fn(async () => this.listener(null));
  reauthenticate = vi.fn(async () => undefined);
  deleteAccount = vi.fn(async () => this.listener(null));

  constructor(private readonly initialUser: AuthUser | null) {}

  subscribe(listener: AuthStateListener) {
    this.listener = listener;
    listener(this.initialUser);
    return () => undefined;
  }
}

describe('App', () => {
  it('saves a submitted answer, filters, and resets progress', async () => {
    const store = memoryStore();
    render(<App bankLoader={loader} progressStore={store} />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    expect(screen.getByText('3 remaining of 3')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Outdated' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /GitHub/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Try 10 free PMLE sample questions/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByText('BigQuery is the analytics warehouse.')).toBeVisible();
    await waitFor(() => expect(store.saveAnswer).toHaveBeenCalledWith('PMLE-0001', true, 'sha256:test', 'local-browser'));
    expect(screen.getByText('✓ Saved!')).toBeVisible();
    expect(screen.queryByText('Report a problem with this question')).not.toBeInTheDocument();
    expect(screen.getByText('2 remaining of 3')).toBeVisible();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Quiz data' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Reset certification progress' }));
    await waitFor(() => expect(store.reset).toHaveBeenCalled());
  });

  it('shows fatal bank errors and recoverable storage errors', async () => {
    const { unmount } = render(<App bankLoader={async () => { throw new Error('Bad bank'); }} progressStore={memoryStore()} />);
    expect(await screen.findByText('Bad bank')).toBeVisible();
    unmount();
    const store = memoryStore(); store.load = vi.fn().mockRejectedValue(new Error('Bad storage'));
    render(<App bankLoader={loader} progressStore={store} />);
    expect(await screen.findByText('Bad storage')).toBeVisible();
  });

  it('shows progress-reconciliation details only in debug mode', async () => {
    const saved: UserProgress = {
      schemaVersion: 1,
      questionBankVersion: 'sha256:old',
      progress: { 'PMLE-retired': true },
      savedForLater: [],
      lastQuestionId: null,
    };
    const { unmount } = render(<App bankLoader={loader} progressStore={memoryStore(saved)} />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    expect(screen.queryByText(/saved reference no longer exists/)).not.toBeInTheDocument();
    unmount();

    window.history.replaceState({}, '', '?debug=true');
    render(<App bankLoader={loader} progressStore={memoryStore(saved)} />);
    expect(await screen.findByText(/1 saved reference no longer exists/)).toBeVisible();
    window.history.replaceState({}, '', '/');
  });

  it('does not retry a failed answer when a later question saves', async () => {
    const store = memoryStore();
    store.saveAnswer.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined);
    render(<App bankLoader={loader} progressStore={store} />);
    expect(await screen.findByText('3 questions')).toBeVisible();

    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(await screen.findByText(/something went wrong while saving your answer/i)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText(/Vertex AI/));
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(await screen.findByText('✓ Saved!')).toBeVisible();

    expect(store.saveAnswer.mock.calls.map(([questionId]) => questionId)).toEqual(['PMLE-0001', 'PMLE-0002']);
  });

  it('opens a metadata-driven learning summary and returns to a review queue', async () => {
    render(<App bankLoader={loader} progressStore={memoryStore()} />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'View full summary →' }));
    expect(screen.getByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'By exam section' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Review queue' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Unanswered/ }));
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeVisible();
  });

  it('requires sign-in before loading questions, preferences, or progress', async () => {
    const auth = new TestAuthService(null);
    const store = memoryStore();
    const bankLoader = vi.fn(expandedLoader);
    const preferences: QuizPreferences = {
      loadFilter: vi.fn<QuizPreferences['loadFilter']>(() => 'unanswered'),
      saveFilter: vi.fn(),
    };
    render(<App bankLoader={bankLoader} progressStore={store} preferences={preferences} authService={auth} dataMode="firebase-emulator" />);
    expect(await screen.findByRole('heading', { name: 'Sign in to practice' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'View sample questions' })).toHaveAttribute('href', '/sample-questions/');
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument();
    expect(bankLoader).not.toHaveBeenCalled();
    expect(store.load).not.toHaveBeenCalled();
    expect(preferences.loadFilter).not.toHaveBeenCalled();
    expect(preferences.saveFilter).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByText('12 questions')).toBeVisible();
    expect(auth.signIn).toHaveBeenCalledOnce();
    expect(bankLoader).toHaveBeenCalledOnce();
    await waitFor(() => expect(store.load).toHaveBeenCalledWith('user-a'));
    expect(preferences.loadFilter).toHaveBeenCalledOnce();
  });

  it('requires sign-in for a summary deep link and returns to the gate on sign-out', async () => {
    window.history.replaceState({}, '', '/practice/?view=summary');
    const auth = new TestAuthService(null);
    const bankLoader = vi.fn(expandedLoader);
    render(<App bankLoader={bankLoader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);
    expect(await screen.findByRole('heading', { name: 'Sign in to view your summary' })).toBeVisible();
    expect(bankLoader).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('heading', { name: 'PMLE progress summary' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Open account menu for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to view your summary' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'PMLE progress summary' })).not.toBeInTheDocument();
    expect(bankLoader).toHaveBeenCalledOnce();
  });

  it('opens sign-in once for a homepage sign-in request and removes the request from the URL', async () => {
    window.history.replaceState({}, '', '/practice/?signIn=true');
    const auth = new TestAuthService(null);

    render(<App bankLoader={expandedLoader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledOnce());
    expect(window.location.pathname).toBe('/practice/');
    expect(window.location.search).toBe('');
  });

  it('keeps the sign-in gate and retry available when sign-in fails', async () => {
    window.history.replaceState({}, '', '/practice/?signIn=true');
    const auth = new TestAuthService(null);
    auth.signIn.mockRejectedValueOnce(new Error('Google sign-in was canceled.'));

    render(<App bankLoader={expandedLoader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);

    expect(await screen.findByText('Google sign-in was canceled.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sign in to practice' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    expect(window.location.pathname).toBe('/practice/');
    expect(window.location.search).toBe('');
  });

  it('loads and posts shared comments with the signed-in identity and question scope', async () => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice' });
    const commentStore: CommentStore = {
      listPage: vi.fn().mockResolvedValue({ items: [], hasNext: false, writesEnabled: true, deletionPending: false }),
      createComment: vi.fn().mockResolvedValue(undefined), editComment: vi.fn(), deleteComment: vi.fn(),
      setReaction: vi.fn(), deleteUserCommentData: vi.fn(),
    };
    render(<App bankLoader={loader} progressStore={memoryStore()} authService={auth} commentStore={commentStore} dataMode="firebase-emulator" />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    await waitFor(() => expect(commentStore.listPage).toHaveBeenCalledOnce());
    await userEvent.type(await screen.findByLabelText('Post as Alice'), 'A shared comment');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    await waitFor(() => expect(commentStore.createComment).toHaveBeenCalledWith('user-a',
      { certificationId: 'pmle', questionId: questions[0].questionId }, 'A shared comment', 'Alice', expect.any(String)));
  });

  it('signs out without an unsaved-progress prompt after submitted answers save independently', async () => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice' });
    render(<App bankLoader={loader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    const confirm = vi.spyOn(window, 'confirm');

    await userEvent.click(screen.getByRole('button', { name: 'Open account menu for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it.each([false, true])('cleans comments before progress and identity, and stops on cleanup failure (%s)', async (failCleanup) => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice', email: 'alice@example.com' });
    const store = memoryStore();
    const order: string[] = [];
    auth.reauthenticate.mockImplementation(async () => { order.push('reauthenticate'); });
    store.reset.mockImplementation(async () => { order.push('reset'); });
    auth.deleteAccount.mockImplementation(async () => { order.push('delete'); });
    const comments: CommentStore = {
      listPage: vi.fn(), createComment: vi.fn(), editComment: vi.fn(), deleteComment: vi.fn(), setReaction: vi.fn(),
      deleteUserCommentData: vi.fn(async () => { order.push('comments'); if (failCleanup) throw new Error('Cleanup interrupted.'); }),
    };
    render(<App bankLoader={loader} progressStore={store} authService={auth} commentStore={comments} dataMode="firebase-emulator" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Open account menu for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Account & data' })).toBeVisible();
    expect(screen.getByText('alice@example.com')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Open a GitHub issue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Support via Buy Me a Coffee' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Star Quiz Trail on GitHub' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const deleteButton = screen.getByRole('button', { name: 'Permanently delete account' });
    expect(deleteButton).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await userEvent.click(deleteButton);

    if (failCleanup) {
      expect(await screen.findByRole('alert')).toHaveTextContent('retry Delete account');
      expect(store.reset).not.toHaveBeenCalled();
      expect(auth.deleteAccount).not.toHaveBeenCalled();
      return;
    }
    await waitFor(() => expect(auth.deleteAccount).toHaveBeenCalledOnce());
    expect(store.reset).toHaveBeenCalledWith('user-a');
    expect(order).toEqual(['reauthenticate', 'comments', 'reset', 'delete']);
  });

  it('shows additional contribution and GitHub support controls in debug mode', async () => {
    window.history.replaceState({}, '', '/practice/?debug=true');
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice' });
    render(<App bankLoader={loader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);

    expect(await screen.findAllByRole('link', { name: 'Buy Me a Coffee' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Open account menu for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByRole('link', { name: 'Open a GitHub issue' })).toHaveAttribute('href', 'https://github.com/Ameenota/quiz-trail/issues/new/choose');
    expect(screen.getByRole('link', { name: 'Support via Buy Me a Coffee' })).toHaveAttribute('href', 'https://buymeacoffee.com/okeanos');
    expect(screen.getByRole('link', { name: 'Star Quiz Trail on GitHub' })).toHaveAttribute('href', 'https://github.com/Ameenota/quiz-trail');
    window.history.replaceState({}, '', '/practice/');
  });

});

it('never loads private content or progress for a guest or a different account', async () => {
  window.history.replaceState({}, '', '/practice/?cert=agentic-ai&view=summary');
  const bankLoader = vi.fn(loader);
  const store = memoryStore();
  const auth = new TestAuthService(null);
  render(<App certification={certifications['agentic-ai']} bankLoader={bankLoader} progressStore={store} authService={auth} />);
  expect(await screen.findByRole('heading', { name: 'Professional Agentic Architect is coming soon' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('This preview is not available to this account.')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'PAA progress summary' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'PAA FAQ' })).toHaveAttribute('href', '/agentic-ai/faq/');
  expect(bankLoader).not.toHaveBeenCalled();
  expect(store.load).not.toHaveBeenCalled();
});
it('loads the preview only for the verified owner and hides it immediately on sign out', async () => {
  window.history.replaceState({}, '', '/practice/?cert=agentic-ai');
  const auth = new TestAuthService({ uid: 'owner', displayName: 'Owner', email: 'ssanghani@gmail.com', emailVerified: true });
  const bankLoader = vi.fn(loader);
  render(<App certification={certifications['agentic-ai']} bankLoader={bankLoader} progressStore={memoryStore()} authService={auth} />);
  expect(await screen.findByRole('heading', { name: 'Professional Agentic Architect practice questions' })).toBeVisible();
  await userEvent.click(screen.getByRole('link', { name: 'PAA summary' }));
  expect(screen.getByRole('heading', { name: 'PAA progress summary' })).toBeVisible();
  expect(window.location.search).toBe('?cert=agentic-ai&view=summary');
  await userEvent.click(screen.getByRole('button', { name: 'Open account menu for Owner' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Professional Agentic Architect is coming soon' })).toBeVisible();
  expect(bankLoader).toHaveBeenCalledTimes(1);
});
