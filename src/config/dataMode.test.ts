import { describe, expect, it } from 'vitest';
import { readDataMode } from './dataMode';

describe('readDataMode', () => {
  it('defaults to local mode when no value is configured', () => {
    expect(readDataMode({})).toBe('local');
    expect(readDataMode({ VITE_DATA_MODE: '  ' })).toBe('local');
  });

  it('accepts each explicit mode case-insensitively', () => {
    expect(readDataMode({ VITE_DATA_MODE: 'LOCAL' })).toBe('local');
    expect(readDataMode({ VITE_DATA_MODE: 'firebase-emulator' })).toBe('firebase-emulator');
    expect(readDataMode({ VITE_DATA_MODE: 'firebase' })).toBe('firebase');
  });

  it('rejects unknown modes instead of guessing', () => {
    expect(() => readDataMode({ VITE_DATA_MODE: 'production' })).toThrow(
      'VITE_DATA_MODE must be one of: local, firebase-emulator, firebase.',
    );
  });
});
