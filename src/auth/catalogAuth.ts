import type { AuthService, AuthUser } from './AuthService';
import { canAccessCertification, certifications } from '../config/certifications';

/** Enhance the static catalog without selecting or loading a question bank. */
export function mountCatalogAuth(auth: AuthService, root: Document = document): () => void {
  const button = root.querySelector<HTMLButtonElement>('[data-catalog-auth]')!;
  const identity = root.querySelector<HTMLElement>('[data-catalog-user]')!;
  const status = root.querySelector<HTMLElement>('[data-catalog-auth-status]')!;
  const preview = root.querySelector<HTMLElement>('[data-paa-practice]')!;
  const pmleContinue = root.querySelector<HTMLAnchorElement>('[data-pmle-continue]')!;
  let user: AuthUser | null = null;
  let resolved = false;
  let busy = false;
  let error: string | null = null;

  const render = () => {
    const local = auth.mode === 'local';
    button.disabled = local || !resolved || busy;
    button.textContent = local ? 'Local mode' : busy ? 'Please wait…' : user ? 'Sign out' : 'Sign in';
    button.title = local ? 'Local preview uses this browser’s progress. Google sign-in is available in cloud mode.' : '';
    identity.hidden = local || !user;
    identity.textContent = user?.displayName ?? '';
    status.textContent = error ?? (!local && user ? 'Signed in. Choose a certification below to continue.' : '');
    status.hidden = !status.textContent;
    preview.hidden = local || !canAccessCertification(certifications['agentic-ai'], user);
    pmleContinue.href = user ? '/practice/' : '/practice/?signIn=true';
    pmleContinue.textContent = user ? 'Continue PMLE →' : 'Already have saved progress? Sign in to continue PMLE →';
  };

  const unsubscribe = auth.subscribe((nextUser) => {
    user = nextUser;
    resolved = true;
    error = null;
    render();
  });
  const handleClick = async () => {
    if (!resolved || busy || auth.mode === 'local') return;
    const signingOut = !!user;
    busy = true;
    error = null;
    render();
    try {
      if (signingOut) await auth.signOut();
      else await auth.signIn();
    } catch (failure) {
      error = signingOut ? 'Sign out could not be completed. Please try again.'
        : failure instanceof Error ? failure.message : 'Sign-in could not be completed. Please try again.';
    } finally {
      busy = false;
      render();
    }
  };
  button.addEventListener('click', handleClick);
  render();
  return () => {
    unsubscribe();
    button.removeEventListener('click', handleClick);
  };
}
