import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnsavedProgressWarning } from './SaveProgressButton';

describe('UnsavedProgressWarning', () => {
  it('appears when ten questions have unsaved answers', () => {
    const { rerender } = render(<UnsavedProgressWarning count={9} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<UnsavedProgressWarning count={10} />);
    expect(screen.getByRole('status')).toHaveTextContent('You have 10 questions with unsaved answers');
  });
});
