import { selectedCertification } from '../config/certifications';
import { LocalStorageQuizPreferences } from '../storage/QuizPreferences';
import { loadQuestionBank } from '../data/csv/loadQuestionBank';
import type { AppProps } from './App';
import { LocalAuthService } from '../auth/AuthService';
import { readDataMode, type DataModeEnvironment } from '../config/dataMode';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { FirebaseEnvironment } from '../firebase/firebaseConfig';

export type AppDependencies = AppProps;

export async function createAppDependencies(
  environment: DataModeEnvironment & FirebaseEnvironment,
): Promise<AppDependencies> {
  const dataMode = readDataMode(environment);
  const certification = selectedCertification(window.location.search);
  const preferences = new LocalStorageQuizPreferences(window.localStorage, certification.id);

  if (dataMode === 'local') {
    return {
      authService: new LocalAuthService(),
      progressStore: new LocalStorageProgressStore(window.localStorage, certification.id),
      certification, preferences,
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
    progressStore: new FirestoreProgressStore(firestore, certification.id),
    certification, preferences,
    bankLoader: certification.id === 'pmle' ? loadQuestionBank : async () => {
      const { loadPrivateQuestionBank } = await import('../data/csv/loadPrivateQuestionBank');
      return loadPrivateQuestionBank(firestore);
    },
    feedbackStore: new FirestoreFeedbackStore(firestore),
    dataMode,
  };
}
