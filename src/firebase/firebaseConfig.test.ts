import { describe, expect, it } from 'vitest';
import { readFirebaseConfig, type FirebaseEnvironment } from './firebaseConfig';

const completeEnvironment: FirebaseEnvironment = {
  VITE_DATA_MODE: 'firebase',
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example',
  VITE_FIREBASE_STORAGE_BUCKET: 'example.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-TEST',
};

describe('readFirebaseConfig', () => {
  it('returns trimmed Firebase options for real Firebase mode', () => {
    const config = readFirebaseConfig({ ...completeEnvironment, VITE_FIREBASE_PROJECT_ID: ' example ' });

    expect(config.options.projectId).toBe('example');
    expect(config.options.measurementId).toBe('G-TEST');
    expect(config.useEmulators).toBe(false);
  });

  it('uses emulator endpoints only in firebase-emulator mode', () => {
    expect(readFirebaseConfig({ ...completeEnvironment, VITE_DATA_MODE: 'firebase-emulator' }).useEmulators).toBe(true);
    expect(readFirebaseConfig(completeEnvironment).useEmulators).toBe(false);
  });

  it('lists missing required variables', () => {
    expect(() => readFirebaseConfig({ VITE_DATA_MODE: 'firebase', VITE_FIREBASE_PROJECT_ID: 'example' })).toThrow(
      /VITE_FIREBASE_API_KEY.*VITE_FIREBASE_AUTH_DOMAIN/,
    );
  });

  it('refuses to initialize Firebase in the default local mode', () => {
    expect(() => readFirebaseConfig({ ...completeEnvironment, VITE_DATA_MODE: undefined })).toThrow(
      'Firebase cannot initialize while VITE_DATA_MODE is local.',
    );
  });
});
