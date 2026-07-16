import {
  GoogleAuthProvider,
  browserLocalPersistence,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { AuthService, AuthStateListener, AuthUser } from './AuthService';

const authMessages: Record<string, string> = {
  'auth/popup-closed-by-user': 'Google sign-in was canceled. You can try again when ready.',
  'auth/cancelled-popup-request': 'A Google sign-in window is already open.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'Google sign-in could not reach Firebase. Check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact the site owner for help.',
  'auth/unauthorized-domain': 'Google sign-in is not authorized for this domain.',
};

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName || user.email || 'Signed-in learner',
    email: user.email || undefined,
    photoUrl: user.photoURL || undefined,
  };
}

export function describeAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
  return authMessages[code] ?? 'Google sign-in could not be completed. Please try again.';
}

export class FirebaseAuthService implements AuthService {
  readonly mode = 'firebase' as const;
  private readonly ready: Promise<void>;

  constructor(private readonly auth: Auth) {
    this.ready = setPersistence(auth, browserLocalPersistence);
  }

  subscribe(listener: AuthStateListener): () => void {
    let unsubscribe: () => void = () => undefined;
    let active = true;
    void this.ready.then(() => {
      if (active) unsubscribe = onAuthStateChanged(this.auth, (user) => listener(user ? toAuthUser(user) : null));
    }).catch(() => {
      if (active) listener(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }

  async signIn(): Promise<void> {
    try {
      await this.ready;
      await signInWithPopup(this.auth, new GoogleAuthProvider());
    } catch (error) {
      throw new Error(describeAuthError(error), { cause: error });
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async reauthenticate(): Promise<void> {
    if (!this.auth.currentUser) throw new Error('Your session has ended. Sign in again before deleting your account.');
    try {
      await reauthenticateWithPopup(this.auth.currentUser, new GoogleAuthProvider());
    } catch (error) {
      throw new Error(describeAuthError(error), { cause: error });
    }
  }

  async deleteAccount(): Promise<void> {
    if (!this.auth.currentUser) throw new Error('Your session has ended. Sign in again before deleting your account.');
    await deleteUser(this.auth.currentUser);
  }
}
