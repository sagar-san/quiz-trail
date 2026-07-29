import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService, AuthStateListener, AuthUser } from '../auth/AuthService';
import type { UserProgress } from '../domain/types';
import type { FeedbackStore } from '../storage/FeedbackStore';
import type { ProgressStore } from '../storage/ProgressStore';
import type { QuizPreferences } from '../storage/QuizPreferences';
import { questions } from '../test/fixtures';
import { App } from './App';

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
    await userEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
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
    expect(screen.getByRole('heading', { name: 'See where you stand.' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'By exam section' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Review queue' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Unanswered/ }));
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeVisible();
  });

  it('allows guest practice without saving and loads account progress after sign-in', async () => {
    const auth = new TestAuthService(null);
    const store = memoryStore();
    const guestPreferences: QuizPreferences = {
      loadFilter: vi.fn<QuizPreferences['loadFilter']>(() => 'saved'),
      saveFilter: vi.fn(),
    };
    const { container } = render(<App bankLoader={expandedLoader} progressStore={store} preferences={guestPreferences} authService={auth} dataMode="firebase-emulator" />);

    expect(await screen.findByText('Practicing as a guest')).toBeVisible();
    expect(screen.getByText(/Try 10 questions as a guest/)).toBeVisible();
    expect(screen.getByText('10 questions')).toBeVisible();
    expect(container.querySelector('.guest-banner')?.nextElementSibling).toBe(container.querySelector('.filter-wrap'));
    expect(store.load).not.toHaveBeenCalled();
    expect(guestPreferences.loadFilter).not.toHaveBeenCalled();
    expect(screen.queryByText('Report a problem with this question')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByText('BigQuery is the analytics warehouse.')).toBeVisible();
    expect(screen.queryByText('✓ Saved!')).not.toBeInTheDocument();
    expect(store.saveAnswer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Mark for this session' }));
    expect(screen.getByRole('button', { name: 'Marked this session' })).toBeVisible();
    expect(store.saveBookmark).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(guestPreferences.saveFilter).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in to save progress' }));

    expect(await screen.findByText('Alice')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open account menu for Alice' }).querySelector('img')).toHaveAttribute('src', 'https://example.com/alice.jpg');
    expect(screen.getByText('Emulator mode')).toBeVisible();
    expect(auth.signIn).toHaveBeenCalledOnce();
    await waitFor(() => expect(store.load).toHaveBeenCalledWith('user-a'));
    expect(await screen.findByText('12 questions')).toBeVisible();
    expect(screen.getByText('0% explored')).toBeVisible();
  });

  it('opens sign-in once for a homepage sign-in request and removes the request from the URL', async () => {
    window.history.replaceState({}, '', '/practice/?signIn=true');
    const auth = new TestAuthService(null);

    render(<App bankLoader={expandedLoader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledOnce());
    expect(window.location.pathname).toBe('/practice/');
    expect(window.location.search).toBe('');
  });

  it('keeps guest practice available when a homepage sign-in request fails', async () => {
    window.history.replaceState({}, '', '/practice/?signIn=true');
    const auth = new TestAuthService(null);
    auth.signIn.mockRejectedValueOnce(new Error('Google sign-in was canceled.'));

    render(<App bankLoader={expandedLoader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);

    expect(await screen.findByText('Google sign-in was canceled.')).toBeVisible();
    expect(screen.getByText('Practicing as a guest')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in to save progress' })).toBeVisible();
    expect(window.location.pathname).toBe('/practice/');
    expect(window.location.search).toBe('');
  });

  it('submits cloud feedback with the question ID and authenticated user ID', async () => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice' });
    const feedbackStore: FeedbackStore = {
      loadFeedback: vi.fn().mockResolvedValue(null),
      submitFeedback: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <App
        bankLoader={loader}
        progressStore={memoryStore()}
        authService={auth}
        feedbackStore={feedbackStore}
        dataMode="firebase-emulator"
      />,
    );

    expect(await screen.findByText('3 questions')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(feedbackStore.loadFeedback).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('More'));
    await waitFor(() => expect(feedbackStore.loadFeedback).toHaveBeenCalledWith(
      questions[0].questionId,
      'user-a',
    ));
    await userEvent.type(
      screen.getByPlaceholderText(/Describe what seems incorrect/),
      'The explanation needs clarification.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));

    await waitFor(() => expect(feedbackStore.submitFeedback).toHaveBeenCalledWith(
      questions[0].questionId,
      'The explanation needs clarification.',
      'user-a',
    ));
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

  it('shows account settings and deletes progress before the authenticated account', async () => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice', email: 'alice@example.com' });
    const store = memoryStore();
    const order: string[] = [];
    auth.reauthenticate.mockImplementation(async () => { order.push('reauthenticate'); });
    store.reset.mockImplementation(async () => { order.push('reset'); });
    auth.deleteAccount.mockImplementation(async () => { order.push('delete'); });
    render(<App bankLoader={loader} progressStore={store} authService={auth} dataMode="firebase-emulator" />);

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

    await waitFor(() => expect(auth.deleteAccount).toHaveBeenCalledOnce());
    expect(store.reset).toHaveBeenCalledWith('user-a');
    expect(order).toEqual(['reauthenticate', 'reset', 'delete']);
  });

  it('shows preserved monetary contribution links only in debug mode', async () => {
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
