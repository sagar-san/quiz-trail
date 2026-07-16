export interface AuthUser {
  uid: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
}

export type AuthStateListener = (user: AuthUser | null) => void;

export interface AuthService {
  readonly mode: 'local' | 'firebase';
  subscribe(listener: AuthStateListener): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const localUser: AuthUser = { uid: 'local-browser', displayName: 'Local browser' };

export class LocalAuthService implements AuthService {
  readonly mode = 'local' as const;

  subscribe(listener: AuthStateListener): () => void {
    listener(localUser);
    return () => undefined;
  }

  async signIn(): Promise<void> {}
  async signOut(): Promise<void> {}
}
