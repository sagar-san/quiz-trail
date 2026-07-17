import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { questions } from '../test/fixtures';
import { QuestionCard } from './QuestionCard';

describe('QuestionCard', () => {
  it('submits a single answer and reveals accessible feedback', async () => {
    const submit = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<QuestionCard question={questions[0]} position={1} total={3} saved={false} onSubmit={submit} onToggleSaved={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Submit answer' });
    expect(button).toBeDisabled();
    expect(screen.queryByLabelText('Question content details')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(button);
    expect(submit).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    await userEvent.click(screen.getByText('More'));
    const details = screen.getByLabelText('Question content details');
    expect(details).toHaveTextContent('Building ML solutions');
    expect(screen.queryByText('Review status')).not.toBeInTheDocument();
    expect(screen.queryByText('Terminology')).not.toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copy AI review prompt' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# PMLE Practice Question Review'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('## Answer choices'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('**Learner answer:** A'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('**Provided expected answer:** A'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('claims, not authoritative facts'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Feel free to disagree and push back'));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'ChatGPT' })).toHaveAttribute('href', 'https://chatgpt.com/');
    expect(screen.getByRole('link', { name: 'Gemini' })).toHaveAttribute('href', 'https://gemini.google.com/app');
    expect(screen.getByRole('link', { name: 'Claude' })).toHaveAttribute('href', 'https://claude.ai/new');
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

  it('reveals internal metadata only when debug mode is explicitly enabled', async () => {
    render(<QuestionCard question={questions[1]} position={2} total={3} saved={false} showInternalMetadata onSubmit={vi.fn()} onToggleSaved={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/Vertex AI/));
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(screen.getByLabelText('Question content details')).toHaveTextContent('SourceGenerated 2026');
    expect(screen.getByLabelText('Question content details')).toHaveTextContent('Review statusUpdated 2026');
    expect(screen.getByLabelText('Question content details')).toHaveTextContent('TerminologyUpdated — AI Platform is now Vertex AI.');
  });

  it('hides feedback reporting form when not in debug mode', async () => {
    const feedbackMock = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionCard
        question={questions[0]}
        position={1}
        total={3}
        saved={false}
        onSubmit={vi.fn()}
        onToggleSaved={vi.fn()}
        onSubmitFeedback={feedbackMock}
      />
    );
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(screen.queryByText('Maintainer Feedback (Bad Question?)')).not.toBeInTheDocument();
  });

  it('renders and submits feedback form when in debug mode', async () => {
    const feedbackMock = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionCard
        question={questions[0]}
        position={1}
        total={3}
        saved={false}
        showInternalMetadata
        onSubmit={vi.fn()}
        onToggleSaved={vi.fn()}
        onSubmitFeedback={feedbackMock}
      />
    );
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    await userEvent.click(screen.getByText('More'));

    expect(screen.getByText('Maintainer Feedback (Bad Question?)')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Describe why this question is bad/);
    const submitBtn = screen.getByRole('button', { name: 'Submit feedback' });

    expect(submitBtn).toBeDisabled();

    await userEvent.type(textarea, 'This is a test feedback for a bad question.');
    expect(submitBtn).toBeEnabled();

    await userEvent.click(submitBtn);
    expect(feedbackMock).toHaveBeenCalledWith('This is a test feedback for a bad question.');

    expect(await screen.findByText('Feedback submitted successfully. Thank you!')).toBeVisible();
  });
});
