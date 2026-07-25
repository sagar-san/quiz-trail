import { describe, expect, it } from 'vitest';
import { questions } from '../test/fixtures';
import { LOCAL_PROGRESS_KEY, LocalStorageProgressStore } from './LocalStorageProgressStore';
import { reconcileProgress } from './reconcileProgress';

const progress = { schemaVersion: 1 as const, questionBankVersion: 'old', progress: { 'PMLE-0001': true, gone: false }, savedForLater: ['PMLE-0002', 'gone'], lastQuestionId: 'gone' };

describe('LocalStorageProgressStore', () => {
  it('saves individual answers and bookmarks, loads, and resets the compact state', async () => {
    const store = new LocalStorageProgressStore();
    expect(await store.load()).toBeNull();
    await store.saveAnswer('PMLE-0001', true, 'sha256:test');
    await store.saveBookmark('PMLE-0002', true, 'sha256:test');
    expect(await new LocalStorageProgressStore().load()).toEqual({
      schemaVersion: 1,
      questionBankVersion: 'sha256:test',
      progress: { 'PMLE-0001': true },
      savedForLater: ['PMLE-0002'],
      lastQuestionId: 'PMLE-0001',
    });
    await store.reset();
    expect(localStorage.getItem(LOCAL_PROGRESS_KEY)).toBeNull();
  });

  it('surfaces corrupt and incompatible data', async () => {
    localStorage.setItem(LOCAL_PROGRESS_KEY, '{bad');
    await expect(new LocalStorageProgressStore().load()).rejects.toThrow('could not be read');
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify({ ...progress, schemaVersion: 2 }));
    await expect(new LocalStorageProgressStore().load()).rejects.toThrow('incompatible');
  });

  it('surfaces storage operation failures', async () => {
    const broken = { getItem: () => null, setItem: () => { throw new DOMException(); }, removeItem: () => { throw new DOMException(); } } as unknown as Storage;
    const store = new LocalStorageProgressStore(broken);
    await expect(store.saveAnswer('PMLE-0001', true, 'test')).rejects.toThrow('could not be saved');
    await expect(store.reset()).rejects.toThrow('could not be cleared');
  });

  it('reconciles removed IDs and bank versions', () => {
    const result = reconcileProgress(progress, questions, 'new');
    expect(result.progress).toMatchObject({ questionBankVersion: 'new', progress: { 'PMLE-0001': true }, savedForLater: ['PMLE-0002'], lastQuestionId: null });
    expect(result.notice).toContain('3 saved references');
  });
});
