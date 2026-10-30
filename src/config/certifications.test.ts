import { expect, it } from 'vitest';
import { certifications, selectedCertification, canAccessCertification } from './certifications';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import { LocalStorageQuizPreferences } from '../storage/QuizPreferences';
it('preserves legacy URLs and rejects unknown certifications', () => {
  expect(selectedCertification('').id).toBe('pmle');
  expect(selectedCertification('?cert=agentic-ai').id).toBe('agentic-ai');
  expect(() => selectedCertification('?cert=unknown')).toThrow('Unknown certification');
  expect(() => selectedCertification('?cert=__proto__')).toThrow();
  expect(canAccessCertification(certifications['agentic-ai'], { uid: 'u', displayName: 'User', email: 'ssanghani@gmail.com' })).toBe(false);
});
it('isolates answers, bookmarks, versions, filters and reset while retaining legacy keys', async () => {
  localStorage.clear();
  const pmle = new LocalStorageProgressStore(localStorage);
  const agentic = new LocalStorageProgressStore(localStorage, 'agentic-ai');
  await pmle.saveAnswer('PMLE-0001', true, 'pmle-version');
  await agentic.saveAnswer('PAA-0001', false, 'agentic-version');
  await agentic.saveBookmark('PAA-0001', true, 'agentic-version');
  expect(JSON.parse(localStorage.getItem('quizTrail.progress.v1')!).progress).toEqual({ 'PMLE-0001': true });
  expect((await agentic.load())?.questionBankVersion).toBe('agentic-version');
  new LocalStorageQuizPreferences(localStorage).saveFilter('incorrect');
  const preferences = new LocalStorageQuizPreferences(localStorage, 'agentic-ai');
  expect(preferences.loadFilter()).toBe('unanswered');
  preferences.saveFilter('saved');
  expect(localStorage.getItem('quizTrail.filter.v1')).toBe('incorrect');
  await agentic.reset();
  expect((await pmle.load())?.progress).toEqual({ 'PMLE-0001': true });
  expect(await agentic.load()).toBeNull();
});
