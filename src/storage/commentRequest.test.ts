import { describe, expect, it } from 'vitest';
import { withDeadline } from './commentRequest';
describe('comment request deadline', () => {
  it('returns successful results and preserves failures', async () => {
    await expect(withDeadline(Promise.resolve('saved'))).resolves.toBe('saved');
    await expect(withDeadline(Promise.reject(new Error('denied')))).rejects.toThrow('denied');
  });
  it('releases a stalled request with retry guidance', async () => {
    await expect(withDeadline(new Promise(() => {}), 1)).rejects.toThrow('It may have saved');
  });
});
