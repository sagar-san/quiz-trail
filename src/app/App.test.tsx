import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService, AuthStateListener, AuthUser } from '../auth/AuthService';
import type { UserProgress } from '../domain/types';
import type { ProgressStore } from '../storage/ProgressStore';
import { questions } from '../test/fixtures';
import { App } from './App';

const loader = async () => ({ questions, version: 'sha256:test' });
const memoryStore = (saved: UserProgress | null = null): ProgressStore & { save: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn> } => ({
  load: vi.fn().mockResolvedValue(saved), save: vi.fn().mockResolvedValue(undefined), reset: vi.fn().mockResolvedValue(undefined),
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
  it('answers, filters, saves, restores, and resets progress', async () => {
    const store = memoryStore();
    render(<App bankLoader={loader} progressStore={store} />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    expect(screen.getByRole('link', { name: /View source/ })).toHaveAttribute('href', 'https://github.com/Ameenota/quiz-trail');
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByText('BigQuery is the analytics warehouse.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Save progress' }));
    await waitFor(() => expect(store.save).toHaveBeenCalled());
    expect(screen.getByText('Progress saved')).toBeVisible();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Data & support' })).toBeVisible();
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

  it('requires sign-in in Firebase mode and shows the signed-in identity', async () => {
    const auth = new TestAuthService(null);
    const store = memoryStore();
    render(<App bankLoader={loader} progressStore={store} authService={auth} dataMode="firebase-emulator" />);

    expect(screen.getByRole('heading', { name: 'What is the PMLE?' })).toBeVisible();
    expect(screen.getByRole('link', { name: /official PMLE certification/ })).toHaveAttribute('href', 'https://cloud.google.com/learn/certification/machine-learning-engineer');
    expect(screen.getByRole('link', { name: /View the source on GitHub/ })).toHaveAttribute('href', 'https://github.com/Ameenota/quiz-trail');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByText('Alice')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open account menu for Alice' }).querySelector('img')).toHaveAttribute('src', 'https://example.com/alice.jpg');
    expect(screen.getByText('Emulator mode')).toBeVisible();
    expect(auth.signIn).toHaveBeenCalledOnce();
    await waitFor(() => expect(store.load).toHaveBeenCalledWith('user-a'));
  });

  it('warns before signing out with unsaved progress', async () => {
    const auth = new TestAuthService({ uid: 'user-a', displayName: 'Alice' });
    render(<App bankLoader={loader} progressStore={memoryStore()} authService={auth} dataMode="firebase-emulator" />);
    expect(await screen.findByText('3 questions')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await userEvent.click(screen.getByRole('button', { name: 'Open account menu for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Sign out and discard them?');
    expect(auth.signOut).not.toHaveBeenCalled();
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
    expect(screen.getByRole('link', { name: 'Open a GitHub issue' })).toHaveAttribute('href', 'https://github.com/Ameenota/quiz-trail/issues/new/choose');
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const deleteButton = screen.getByRole('button', { name: 'Permanently delete account' });
    expect(deleteButton).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await userEvent.click(deleteButton);

    await waitFor(() => expect(auth.deleteAccount).toHaveBeenCalledOnce());
    expect(store.reset).toHaveBeenCalledWith('user-a');
    expect(order).toEqual(['reauthenticate', 'reset', 'delete']);
  });
});
