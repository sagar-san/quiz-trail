import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { afterAll, describe, expect, it } from 'vitest';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'quiz-trail-auth-test' }, 'auth-emulator-test');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

afterAll(async () => deleteApp(app));

describe('Firebase Auth emulator', () => {
  it('issues an authenticated UID and reports sign-out through the auth-state observer', async () => {
    const observed: Array<string | null> = [];
    const unsubscribe = onAuthStateChanged(auth, (user) => observed.push(user?.uid ?? null));

    const credential = await createUserWithEmailAndPassword(auth, 'alice@example.com', 'local-test-password');
    expect(credential.user.uid).toBeTruthy();
    expect(auth.currentUser?.uid).toBe(credential.user.uid);

    await signOut(auth);
    expect(auth.currentUser).toBeNull();
    expect(observed).toContain(credential.user.uid);
    expect(observed.at(-1)).toBeNull();
    unsubscribe();
  });
});
