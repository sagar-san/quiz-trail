import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocalAuthService, type AuthService, type AuthStateListener } from './AuthService';
import { mountCatalogAuth } from './catalogAuth';

let dispose: () => void;
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = `
    <button data-catalog-auth disabled>Sign in</button>
    <span data-catalog-user hidden></span>
    <p data-catalog-auth-status role="status" hidden></p>
    <a href="/practice/?cert=agentic-ai">Practice Agentic AI</a>
    <a data-pmle-continue href="/practice/?signIn=true">Continue PMLE</a>`;
});
afterEach(() => { dispose?.(); document.body.innerHTML = ''; });

it('keeps the catalog in place after a canceled sign-in and allows a retry', async () => {
  let listener: AuthStateListener = () => undefined;
  const auth: AuthService = {
    mode: 'firebase',
    subscribe: (next) => { listener = next; next(null); return () => undefined; },
    signIn: vi.fn().mockRejectedValueOnce(new Error('Google sign-in was canceled.')).mockImplementationOnce(async () => {
      listener({ uid: 'learner', displayName: 'Learner', email: 'learner@example.com', emailVerified: true });
    }),
    signOut: vi.fn(async () => listener(null)),
    reauthenticate: vi.fn(),
    deleteAccount: vi.fn(),
  };
  dispose = mountCatalogAuth(auth);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Google sign-in was canceled.');
  expect(window.location.pathname).toBe('/');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('button', { name: 'Sign out' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Choose a certification');
  expect(screen.getByRole('link', { name: 'Practice Agentic AI' })).toBeVisible();
  expect(window.location.pathname).toBe('/');
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
});

it('shows local mode without offering Google sign-in', () => {
  const auth = new LocalAuthService();
  const signIn = vi.spyOn(auth, 'signIn');
  dispose = mountCatalogAuth(auth);
  expect(screen.getByRole('button', { name: 'Local mode' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Continue PMLE →' })).toHaveAttribute('href', '/practice/');
  expect(screen.getByRole('link', { name: 'Practice Agentic AI' })).toBeVisible();
  expect(signIn).not.toHaveBeenCalled();
});
