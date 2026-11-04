import { describe, expect, it } from 'vitest';
import { publicCommentName } from './CommentStore';
describe('public comment names', () => {
  it.each([
    ['Alice Smith', 'Alice'], ['  José   García ', 'José'], ['Mei\tChen', 'Mei'],
    ['Amina', 'Amina'], ['', 'Learner'], ['   ', 'Learner'], [undefined, 'Learner'],
    ['alice@example.com', 'Learner'], ['Alice <alice@example.com>', 'Learner'],
  ])('uses a first-name label for %s', (input, expected) => {
    expect(publicCommentName(input)).toBe(expected);
  });
});
