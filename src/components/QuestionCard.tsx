import { useState } from 'react';
import type { ChoiceKey, QuizQuestion } from '../domain/types';

interface QuestionCardProps {
  question: QuizQuestion;
  position: number;
  total: number;
  saved: boolean;
  priorOutcome?: boolean;
  showInternalMetadata?: boolean;
  onSubmit: (correct: boolean) => void;
  onToggleSaved: () => void;
  onSubmitFeedback?: (feedbackText: string) => Promise<void>;
}

const sameAnswers = (selected: ChoiceKey[], correct: ChoiceKey[]) =>
  selected.length === correct.length && selected.every((answer) => correct.includes(answer));

function buildReviewPrompt(question: QuizQuestion, selected: ChoiceKey[]) {
  const choices = question.options.map((option) => `- **${option.key}.** ${option.text}`).join('\n');
  return [
    '# PMLE Practice Question Review',
    '',
    `**Question ID:** ${question.questionId}`,
    '',
    '## Question',
    '',
    question.prompt,
    '',
    '## Answer choices',
    '',
    choices,
    '',
    '## Answers to evaluate',
    '',
    `- **Learner answer:** ${selected.join(', ')}`,
    `- **Provided expected answer:** ${question.correctAnswers.join(', ')}`,
    '',
    '## Provided explanation',
    '',
    question.explanation,
    '',
    ...(question.referenceUrl ? ['## Provided reference', '', question.referenceUrl, ''] : []),
    '## Review instructions',
    '',
    '1. Independently solve the question before evaluating the provided expected answer.',
    '2. Treat the expected answer and explanation as claims, not authoritative facts.',
    '3. Explain the correct reasoning and why each distractor is right or wrong.',
    '4. Flag anything outdated, ambiguous, or inaccurate.',
    '5. Feel free to disagree and push back when warranted.',
    '6. Prefer and cite current official Google Cloud documentation.',
  ].join('\n');
}

export function QuestionCard({
  question,
  position,
  total,
  saved,
  priorOutcome,
  showInternalMetadata = false,
  onSubmit,
  onToggleSaved,
  onSubmitFeedback,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<ChoiceKey[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'submitted' | 'failed'>('idle');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !onSubmitFeedback) return;
    setFeedbackStatus('submitting');
    setFeedbackError(null);
    try {
      await onSubmitFeedback(feedbackText.trim());
      setFeedbackStatus('submitted');
      setFeedbackText('');
    } catch (err) {
      setFeedbackStatus('failed');
      setFeedbackError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    }
  };

  const multiple = question.questionType === 'multiple_choice';
  const reviewPrompt = buildReviewPrompt(question, selected);
  const toggleChoice = (key: ChoiceKey) => {
    if (submitted) return;
    setSelected((current) => multiple
      ? current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      : [key]);
  };
  const submit = () => {
    if (!selected.length) return;
    onSubmit(sameAnswers(selected, question.correctAnswers));
    setSubmitted(true);
  };
  const copyReviewPrompt = async () => {
    try {
      await navigator.clipboard.writeText(reviewPrompt);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <article className="question-card" aria-labelledby={`question-${question.questionId}`}>
      <div className="question-meta">
        <span>Question {position} of {total}</span>
        <span>{question.questionId}</span>
      </div>
      <div className="question-heading-row">
        <div>
          {multiple && <p className="multiple-label">Select all that apply</p>}
          <p className="question-prompt" id={`question-${question.questionId}`}>{question.prompt}</p>
        </div>
        <button
          type="button"
          className={`bookmark-button${saved ? ' is-saved' : ''}`}
          aria-pressed={saved}
          onClick={onToggleSaved}
        >
          <span aria-hidden="true">{saved ? '★' : '☆'}</span>
          {saved ? 'Saved for later' : 'Save for later'}
        </button>
      </div>
      {priorOutcome !== undefined && !submitted && (
        <p className={`prior-result ${priorOutcome ? 'correct' : 'incorrect'}`}>
          Last answer: {priorOutcome ? 'correct' : 'incorrect'}. You can answer again.
        </p>
      )}
      <fieldset className="choice-list">
        <legend>{multiple ? 'Choose two or more answers' : 'Choose one answer'}</legend>
        {question.options.map((option) => {
          const checked = selected.includes(option.key);
          const isCorrect = submitted && question.correctAnswers.includes(option.key);
          const isWrong = submitted && checked && !isCorrect;
          return (
            <label key={option.key} className={`choice${isCorrect ? ' choice-correct' : ''}${isWrong ? ' choice-wrong' : ''}`}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`answer-${question.questionId}`}
                checked={checked}
                disabled={submitted}
                onChange={() => toggleChoice(option.key)}
              />
              <span className="choice-key">{option.key}</span>
              <span>{option.text}</span>
              {isCorrect && <span className="choice-result">Correct answer</span>}
              {isWrong && <span className="choice-result">Your selection</span>}
            </label>
          );
        })}
      </fieldset>
      {!submitted ? (
        <button type="button" className="primary-button" disabled={!selected.length} onClick={submit}>Submit answer</button>
      ) : (
        <div className={`feedback ${sameAnswers(selected, question.correctAnswers) ? 'feedback-correct' : 'feedback-incorrect'}`} role="status" aria-live="polite">
          <h3>{sameAnswers(selected, question.correctAnswers) ? 'Correct' : 'Not quite'}</h3>
          <p>{question.explanation}</p>
          {question.referenceUrl && (
            <a href={question.referenceUrl} target="_blank" rel="noopener noreferrer">Read the reference <span aria-hidden="true">↗</span></a>
          )}
          <details className="more-options-details" aria-label="More options">
            <summary>More <span aria-hidden="true">⌄</span></summary>
            <div className="more-options-content">
              <div className="ai-review-action">
                <div>
                  <strong>Want another explanation?</strong>
                  <span>
                    Copy the question context, then paste it into{' '}
                    <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a>,{' '}
                    <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">Gemini</a>,{' '}
                    <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Claude</a>, or your preferred AI app.
                  </span>
                </div>
                <button type="button" className="secondary-button" onClick={() => void copyReviewPrompt()}>
                  {copyStatus === 'copied' ? 'Copied!' : 'Copy AI review prompt'}
                </button>
              </div>
              {copyStatus === 'failed' && <p className="ai-review-error" role="alert">Could not access your clipboard. Copying may be blocked by your browser.</p>}
              <p className="ai-review-note">Only question content is copied. AI responses may be inaccurate.</p>
              {showInternalMetadata && onSubmitFeedback && (
                <div className="maintainer-feedback-action">
                  <h4>Maintainer Feedback (Bad Question?)</h4>
                  {feedbackStatus === 'submitted' ? (
                    <p className="feedback-success">Feedback submitted successfully. Thank you!</p>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit}>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Describe why this question is bad or incorrect..."
                        maxLength={1000}
                        disabled={feedbackStatus === 'submitting'}
                        rows={3}
                      />
                      <div className="feedback-form-actions">
                        <span>{feedbackText.length}/1000 characters</span>
                        <button
                          type="submit"
                          className="secondary-button"
                          disabled={!feedbackText.trim() || feedbackStatus === 'submitting'}
                        >
                          {feedbackStatus === 'submitting' ? 'Submitting...' : 'Submit feedback'}
                        </button>
                      </div>
                      {feedbackStatus === 'failed' && (
                        <p className="feedback-error" role="alert">{feedbackError || 'Failed to submit feedback.'}</p>
                      )}
                    </form>
                  )}
                </div>
              )}
              <div className="content-metadata-section" aria-label="Question content details">
                <h4>Question details</h4>
                <dl className="content-metadata-list">
                  <div><dt>Exam section</dt><dd>{question.examSection}</dd></div>
                  <div><dt>Objectives</dt><dd>{question.examObjectives.join(', ')}</dd></div>
                  <div><dt>Topics</dt><dd>{question.topics.join(', ')}</dd></div>
                  <div><dt>Difficulty</dt><dd>{question.difficulty}</dd></div>
                  {showInternalMetadata && <div><dt>Source</dt><dd>{question.questionSource}</dd></div>}
                  {showInternalMetadata && <div><dt>Review status</dt><dd>{question.reviewStatus}</dd></div>}
                  {showInternalMetadata && (question.terminologyStatus || question.terminologyNotes) && <div><dt>Terminology</dt><dd>{question.terminologyStatus || 'See note'}{question.terminologyNotes ? ` — ${question.terminologyNotes}` : ''}</dd></div>}
                  {question.isOutdated && <div><dt>Currency</dt><dd>Flagged as outdated</dd></div>}
                </dl>
              </div>
            </div>
          </details>
        </div>
      )}
    </article>
  );
}
