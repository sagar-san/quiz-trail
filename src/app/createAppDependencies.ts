import { LocalAuthService, type AuthService } from '../auth/AuthService';
import { readDataMode, type DataMode, type DataModeEnvironment } from '../config/dataMode';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { ProgressStore } from '../storage/ProgressStore';
import type { FirebaseEnvironment } from '../firebase/firebaseConfig';

export interface AppDependencies {
  authService: AuthService;
  progressStore: ProgressStore;
  dataMode: DataMode;
}

export async function createAppDependencies(
  environment: DataModeEnvironment & FirebaseEnvironment,
): Promise<AppDependencies> {
  const dataMode = readDataMode(environment);

  if (dataMode === 'local') {
    return { authService: new LocalAuthService(), progressStore: new LocalStorageProgressStore(), dataMode };
  }

  const [{ FirebaseAuthService }, { initializeFirebaseServices }, { FirestoreProgressStore }] = await Promise.all([
    import('../auth/FirebaseAuthService'),
    import('../firebase/firebase'),
    import('../storage/FirestoreProgressStore'),
  ]);
  const { auth, firestore } = initializeFirebaseServices(environment);
  return {
    authService: new FirebaseAuthService(auth),
    progressStore: new FirestoreProgressStore(firestore),
    dataMode,
  };
}
