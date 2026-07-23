import { describe, expect, it } from 'vitest';
import { FILTER_PREFERENCE_KEY, LocalStorageQuizPreferences } from './QuizPreferences';

describe('LocalStorageQuizPreferences', () => {
  it('defaults to Unanswered and restores a valid saved filter', () => {
    const preferences = new LocalStorageQuizPreferences();
    expect(preferences.loadFilter()).toBe('unanswered');
    preferences.saveFilter('incorrect');
    expect(new LocalStorageQuizPreferences().loadFilter()).toBe('incorrect');
  });

  it('ignores invalid and unavailable browser storage', () => {
    localStorage.setItem(FILTER_PREFERENCE_KEY, 'bogus');
    expect(new LocalStorageQuizPreferences().loadFilter()).toBe('unanswered');
    const broken = {
      getItem: () => { throw new DOMException(); },
      setItem: () => { throw new DOMException(); },
    } as unknown as Storage;
    const preferences = new LocalStorageQuizPreferences(broken);
    expect(preferences.loadFilter()).toBe('unanswered');
    expect(() => preferences.saveFilter('saved')).not.toThrow();
  });

  it('falls back from the removed Outdated filter', () => {
    localStorage.setItem(FILTER_PREFERENCE_KEY, 'outdated');
    expect(new LocalStorageQuizPreferences().loadFilter()).toBe('unanswered');
  });
});
