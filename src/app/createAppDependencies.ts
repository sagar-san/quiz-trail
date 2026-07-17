import { LocalAuthService, type AuthService } from '../auth/AuthService';
import { readDataMode, type DataMode, type DataModeEnvironment } from '../config/dataMode';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import { LocalFeedbackStore } from '../storage/FeedbackStore';
import type { ProgressStore } from '../storage/ProgressStore';
import type { FeedbackStore } from '../storage/FeedbackStore';
import type { FirebaseEnvironment } from '../firebase/firebaseConfig';

export interface AppDependencies {
  authService: AuthService;
  progressStore: ProgressStore;
  feedbackStore: FeedbackStore;
  dataMode: DataMode;
}

export async function createAppDependencies(
  environment: DataModeEnvironment & FirebaseEnvironment,
): Promise<AppDependencies> {
  const dataMode = readDataMode(environment);

  if (dataMode === 'local') {
    return {
      authService: new LocalAuthService(),
      progressStore: new LocalStorageProgressStore(),
      feedbackStore: new LocalFeedbackStore(),
      dataMode,
    };
  }

  const [
    { FirebaseAuthService },
    { initializeFirebaseServices },
    { FirestoreProgressStore },
    { FirestoreFeedbackStore },
  ] = await Promise.all([
    import('../auth/FirebaseAuthService'),
    import('../firebase/firebase'),
    import('../storage/FirestoreProgressStore'),
    import('../storage/FirestoreFeedbackStore'),
  ]);
  const { auth, firestore } = initializeFirebaseServices(environment);
  return {
    authService: new FirebaseAuthService(auth),
    progressStore: new FirestoreProgressStore(firestore),
    feedbackStore: new FirestoreFeedbackStore(firestore),
    dataMode,
  };
}
