export interface LocalIdentity {
  uid: 'local-browser';
  displayName: 'Local browser';
}

export interface AuthService {
  currentUser(): Promise<LocalIdentity>;
}

export class LocalAuthService implements AuthService {
  async currentUser(): Promise<LocalIdentity> {
    return { uid: 'local-browser', displayName: 'Local browser' };
  }
}
