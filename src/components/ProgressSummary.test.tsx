import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressSummary } from './ProgressSummary';

describe('ProgressSummary', () => {
  it('shows no score before the learner answers a question', () => {
    render(<ProgressSummary counts={{ total: 10, attempted: 0, correct: 0, incorrect: 0, saved: 0, remaining: 10 }} onOpenSummary={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '0% explored' })).toBeVisible();
    expect(within(screen.getByText('Score').parentElement!).getByText('—')).toBeVisible();
  });

  it('shows the rounded percentage of attempted questions answered correctly', () => {
    render(<ProgressSummary counts={{ total: 10, attempted: 3, correct: 2, incorrect: 1, saved: 0, remaining: 7 }} onOpenSummary={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '30% explored' })).toBeVisible();
    expect(within(screen.getByText('Score').parentElement!).getByText('67%')).toBeVisible();
  });
});
