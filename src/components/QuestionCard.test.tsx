import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { questions } from '../test/fixtures';
import { QuestionCard } from './QuestionCard';

describe('QuestionCard', () => {
  it('submits a single answer and reveals accessible feedback', async () => {
    const submit = vi.fn();
    render(<QuestionCard question={questions[0]} position={1} total={3} saved={false} onSubmit={submit} onToggleSaved={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Submit answer' });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(button);
    expect(submit).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
  });

  it('requires the exact multiple-choice set and toggles saved state', async () => {
    const submit = vi.fn(); const toggle = vi.fn();
    render(<QuestionCard question={questions[1]} position={2} total={3} saved={false} onSubmit={submit} onToggleSaved={toggle} />);
    expect(screen.getByText('Select all that apply')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/Vertex AI/));
    await userEvent.click(screen.getByLabelText(/A laptop/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(submit).toHaveBeenCalledWith(false);
    await userEvent.click(screen.getByRole('button', { name: 'Save for later' }));
    expect(toggle).toHaveBeenCalled();
  });
});
