import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { readFirebaseConfig, type FirebaseEnvironment } from './firebaseConfig';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
}

let services: FirebaseServices | null = null;

export function initializeFirebaseServices(environment: FirebaseEnvironment = import.meta.env): FirebaseServices {
  if (services) return services;

  const runtimeConfig = readFirebaseConfig(environment);
  const app = getApps().length > 0 ? getApp() : initializeApp(runtimeConfig.options);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  if (runtimeConfig.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  }

  services = { app, auth, firestore };
  return services;
}
