import { describe, expect, it } from 'vitest';
import { describeAuthError } from './FirebaseAuthService';

describe('describeAuthError', () => {
  it('turns expected Firebase failures into actionable messages', () => {
    expect(describeAuthError({ code: 'auth/popup-blocked' })).toMatch(/Allow pop-ups/);
    expect(describeAuthError({ code: 'auth/unauthorized-domain' })).toMatch(/not authorized/);
    expect(describeAuthError({ code: 'auth/network-request-failed' })).toMatch(/connection/);
  });

  it('uses a safe fallback without exposing internal errors', () => {
    expect(describeAuthError(new Error('secret detail'))).toBe('Google sign-in could not be completed. Please try again.');
  });
});
