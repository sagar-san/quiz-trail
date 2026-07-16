import type { FirebaseOptions } from 'firebase/app';
import { readDataMode, type DataModeEnvironment } from '../config/dataMode';

export interface FirebaseEnvironment extends DataModeEnvironment {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MEASUREMENT_ID?: string;
}

export interface FirebaseRuntimeConfig {
  options: FirebaseOptions;
  useEmulators: boolean;
}

const requiredVariables = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function readFirebaseConfig(environment: FirebaseEnvironment): FirebaseRuntimeConfig {
  const mode = readDataMode(environment);
  if (mode === 'local') {
    throw new Error('Firebase cannot initialize while VITE_DATA_MODE is local.');
  }

  const missing = requiredVariables.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Firebase configuration is incomplete. Missing: ${missing.join(', ')}.`);
  }

  return {
    options: {
      apiKey: environment.VITE_FIREBASE_API_KEY!.trim(),
      authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN!.trim(),
      projectId: environment.VITE_FIREBASE_PROJECT_ID!.trim(),
      storageBucket: environment.VITE_FIREBASE_STORAGE_BUCKET!.trim(),
      messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID!.trim(),
      appId: environment.VITE_FIREBASE_APP_ID!.trim(),
      measurementId: environment.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
    },
    useEmulators: mode === 'firebase-emulator',
  };
}
