import { LocalAuthService } from './auth/AuthService';
import { mountCatalogAuth } from './auth/catalogAuth';
import { readDataMode } from './config/dataMode';

async function startCatalogAuth() {
  try {
    if (readDataMode(import.meta.env) === 'local') {
      mountCatalogAuth(new LocalAuthService());
      return;
    }
    const [{ FirebaseAuthService }, { initializeFirebaseServices }] = await Promise.all([
      import('./auth/FirebaseAuthService'),
      import('./firebase/firebase'),
    ]);
    const { auth } = initializeFirebaseServices(import.meta.env);
    mountCatalogAuth(new FirebaseAuthService(auth));
  } catch {
    const button = document.querySelector<HTMLButtonElement>('[data-catalog-auth]')!;
    const status = document.querySelector<HTMLElement>('[data-catalog-auth-status]')!;
    button.textContent = 'Sign-in unavailable';
    status.textContent = 'Sign-in could not load. Refresh to try again. You can still browse the public sample questions.';
    status.hidden = false;
  }
}

void startCatalogAuth();
