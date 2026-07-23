import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { questions } from '../test/fixtures';
import { QuestionCard } from './QuestionCard';

describe('QuestionCard', () => {
  it('submits a single answer and reveals accessible feedback', async () => {
    const submit = vi.fn();
    const copiedPrompts: string[] = [];
    const execCommand = vi.fn(() => {
      if (document.activeElement instanceof HTMLTextAreaElement) copiedPrompts.push(document.activeElement.value);
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(<QuestionCard question={questions[0]} progressLabel="Question 1 of 3" saved={false} onSubmit={submit} onToggleSaved={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Submit answer' });
    expect(button).toBeDisabled();
    expect(screen.queryByLabelText('Question content details')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(button);
    expect(submit).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    expect(screen.queryByText('Want another explanation?')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read the reference/ })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Copy AI review prompt' }));
    expect(screen.getByRole('button', { name: 'AI review prompt copied' })).toHaveTextContent('✓ Copied');
    await userEvent.click(screen.getByText('More'));
    const details = screen.getByLabelText('Question content details');
    expect(details).toHaveTextContent('Building ML solutions');
    expect(screen.queryByText('Review status')).not.toBeInTheDocument();
    expect(screen.queryByText('Terminology')).not.toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(copiedPrompts[0].startsWith(
      "You are an instructor guiding a student who is preparing for Google Cloud's Professional Machine Learning Engineer certification."
    )).toBe(true);
    expect(copiedPrompts[0]).not.toContain('PMLE Practice Question Review');
    expect(copiedPrompts[0]).not.toContain('**Question ID:**');
    expect(copiedPrompts[0]).toContain('# Answer choices');
    expect(copiedPrompts[0]).toContain('# Learner answer\n\nA');
    expect(copiedPrompts[0]).toContain('**Provided expected answer:** A');
    expect(copiedPrompts[0]).toContain('Do not consider the learner answer or question-bank claims');
    expect(copiedPrompts[0]).toContain('State your independently selected answer');
    expect(copiedPrompts[0]).toContain('Do not assume agreement is evidence of correctness');
    expect(copiedPrompts[0]).toContain('DISAGREE');
    expect(copiedPrompts[0]).toContain('AMBIGUOUS');
    expect(copiedPrompts[0]).toContain('INVALID');
    expect(copiedPrompts[0]).toContain('do not force an answer');
    expect(copiedPrompts[0]).toContain('# Untrusted question-bank claims are as follows:');
    expect(copiedPrompts[0]).toContain('**Provided explanation:**');
    expect(copiedPrompts[0]).toContain('**Provided reference:**');
    expect(copiedPrompts[0]).not.toContain('# Provided explanation');
    expect(copiedPrompts[0]).not.toContain('# Provided reference');
    expect(copiedPrompts[0]).not.toMatch(/^## /m);
    expect(copiedPrompts[0].indexOf('# Review instructions')).toBeLessThan(
      copiedPrompts[0].indexOf('# Question')
    );
    expect(copiedPrompts[0].indexOf('# Review instructions')).toBeLessThan(
      copiedPrompts[0].indexOf('# Untrusted question-bank claims are as follows:')
    );
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'AI review prompt copied' }));
    expect(execCommand).toHaveBeenCalledTimes(2);
  });

  it('reports when the browser cannot copy the AI review prompt', async () => {
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    render(<QuestionCard question={questions[0]} progressLabel="Question 1 of 3" saved={false} onSubmit={vi.fn()} onToggleSaved={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy AI review prompt' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not access your clipboard');
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('requires the exact multiple-choice set and toggles saved state', async () => {
    const submit = vi.fn(); const toggle = vi.fn();
    render(<QuestionCard question={questions[1]} progressLabel="Question 2 of 3" saved={false} onSubmit={submit} onToggleSaved={toggle} />);
    expect(screen.getByText('Select all that apply')).toBeVisible();
    await userEvent.click(screen.getByLabelText(/Vertex AI/));
    await userEvent.click(screen.getByLabelText(/A laptop/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(submit).toHaveBeenCalledWith(false);
    await userEvent.click(screen.getByRole('button', { name: 'Save for later' }));
    expect(toggle).toHaveBeenCalled();
  });

  it('reveals internal metadata only when debug mode is explicitly enabled', async () => {
    render(<QuestionCard question={questions[1]} progressLabel="Question 2 of 3" saved={false} showInternalMetadata onSubmit={vi.fn()} onToggleSaved={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/Vertex AI/));
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(screen.getByLabelText('Question content details')).toHaveTextContent('SourceGenerated 2026');
    expect(screen.getByLabelText('Question content details')).toHaveTextContent('Review statusUpdated 2026');
    expect(screen.getByLabelText('Question content details')).toHaveTextContent('TerminologyUpdated — AI Platform is now Vertex AI.');
  });

  it('hides feedback reporting form when no feedback handler is available', async () => {
    render(
      <QuestionCard
        question={questions[0]}
        progressLabel="Question 1 of 3"
        saved={false}
        onSubmit={vi.fn()}
        onToggleSaved={vi.fn()}
      />
    );
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(screen.queryByText('Report a problem with this question')).not.toBeInTheDocument();
  });

  it('renders and submits feedback for ordinary learners', async () => {
    const feedbackMock = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionCard
        question={questions[0]}
        progressLabel="Question 1 of 3"
        saved={false}
        onSubmit={vi.fn()}
        onToggleSaved={vi.fn()}
        onSubmitFeedback={feedbackMock}
      />
    );
    await userEvent.click(screen.getByLabelText(/BigQuery/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    await userEvent.click(screen.getByText('More'));

    expect(screen.getByText('Report a problem with this question')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Describe what seems incorrect/);
    const submitBtn = screen.getByRole('button', { name: 'Submit feedback' });

    expect(submitBtn).toBeDisabled();

    await userEvent.type(textarea, 'This is a test feedback for a bad question.');
    expect(submitBtn).toBeEnabled();

    await userEvent.click(submitBtn);
    expect(feedbackMock).toHaveBeenCalledWith('This is a test feedback for a bad question.');

    expect(await screen.findByText('Feedback submitted successfully. Thank you!')).toBeVisible();
  });
});
