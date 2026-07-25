import { useState } from 'react';
import type { ChoiceKey, QuizQuestion } from '../domain/types';

interface QuestionCardProps {
  question: QuizQuestion;
  progressLabel: string;
  saved: boolean;
  priorOutcome?: boolean;
  showInternalMetadata?: boolean;
  onSubmit: (correct: boolean) => Promise<void>;
  onToggleSaved: () => void;
  onSubmitFeedback?: (feedbackText: string) => Promise<void>;
}

const sameAnswers = (selected: ChoiceKey[], correct: ChoiceKey[]) =>
  selected.length === correct.length && selected.every((answer) => correct.includes(answer));

function buildReviewPrompt(question: QuizQuestion, selected: ChoiceKey[]) {
  const choices = question.options.map((option) => `- **${option.key}.** ${option.text}`).join('\n');
  return [
    "You are an instructor guiding a student who is preparing for Google Cloud's Professional Machine Learning Engineer certification. Review this practice question for technical accuracy using current official Google Cloud documentation, and explain your conclusions in clear teaching language.",
    '',
    '# Review instructions',
    '',
    'Act as an independent reviewer. The provided expected answer and explanation may be wrong.',
    '',
    '1. Determine the correct answer using only the question, answer choices, and current official Google Cloud documentation. Do not consider the learner answer or question-bank claims until you have reached and stated your own conclusion.',
    '2. State your independently selected answer and reasoning before evaluating the learner answer or provided expected answer.',
    '3. Compare your answer with the provided expected answer. Do not assume agreement is evidence of correctness.',
    '4. Give one verdict: AGREE (the provided answer is supported), DISAGREE (another answer is better supported), AMBIGUOUS (more than one answer is defensible), OUTDATED (current Google Cloud guidance changes the answer), or INVALID (the question is fundamentally flawed or cannot be answered as written).',
    '5. If you disagree, identify the correct answer and explain specifically why the provided answer fails.',
    '6. If the question is invalid, say so clearly, explain the defect, and do not force an answer.',
    '7. Evaluate every answer choice independently; do not rationalize choices merely to support the provided answer.',
    '8. Cite current official Google Cloud documentation for material claims. If evidence is insufficient, say so rather than guessing.',
    '',
    '# Question',
    '',
    question.prompt,
    '',
    '# Answer choices',
    '',
    choices,
    '',
    '# Learner answer',
    '',
    selected.join(', '),
    '',
    '# Untrusted question-bank claims are as follows:',
    '',
    `**Provided expected answer:** ${question.correctAnswers.join(', ')}`,
    '',
    '**Provided explanation:**',
    '',
    question.explanation,
    '',
    ...(question.referenceUrl ? ['**Provided reference:**', '', question.referenceUrl, ''] : []),
  ].join('\n');
}

function copyText(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  Object.assign(textarea.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    padding: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export function QuestionCard({
  question,
  progressLabel,
  saved,
  priorOutcome,
  showInternalMetadata = false,
  onSubmit,
  onToggleSaved,
  onSubmitFeedback,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<ChoiceKey[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
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
    setSubmitted(true);
    setSaveStatus('saving');
    void Promise.resolve(onSubmit(sameAnswers(selected, question.correctAnswers)))
      .then(() => {
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(() => setSaveStatus('failed'));
  };
  const copyReviewPrompt = () => {
    setCopyStatus(copyText(reviewPrompt) ? 'copied' : 'failed');
  };

  return (
    <article className="question-card" aria-labelledby={`question-${question.questionId}`}>
      <div className="question-meta">
        <span>{progressLabel}</span>
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
      {saveStatus !== 'idle' && (
        <p className={`answer-save-status${saveStatus === 'failed' ? ' error-message' : ''}`} aria-live="polite">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved!' : 'We’re sorry, something went wrong while saving your answer.'}
        </p>
      )}
      {!submitted ? (
        <button type="button" className="primary-button" disabled={!selected.length} onClick={submit}>Submit answer</button>
      ) : (
        <div className={`feedback ${sameAnswers(selected, question.correctAnswers) ? 'feedback-correct' : 'feedback-incorrect'}`} role="status" aria-live="polite">
          <h3>{sameAnswers(selected, question.correctAnswers) ? 'Correct' : 'Not quite'}</h3>
          <p>{question.explanation}</p>
          <div className="feedback-actions">
            {question.referenceUrl && (
              <a href={question.referenceUrl} target="_blank" rel="noopener noreferrer">Read the reference <span aria-hidden="true">↗</span></a>
            )}
            <button
              type="button"
              className="ai-prompt-link"
              aria-label={copyStatus === 'copied' ? 'AI review prompt copied' : 'Copy AI review prompt'}
              onClick={copyReviewPrompt}
            >
              <span aria-hidden="true">{copyStatus === 'copied' ? '✓' : '✨'}</span>{' '}
              {copyStatus === 'copied' ? 'Copied' : 'Copy AI prompt'}
            </button>
          </div>
          {copyStatus === 'failed' && <p className="ai-review-error" role="alert">Could not access your clipboard. Copying may be blocked by your browser.</p>}
          <details className="more-options-details" aria-label="More options">
            <summary>More <span aria-hidden="true">⌄</span></summary>
            <div className="more-options-content">
              {onSubmitFeedback && (
                <div className="question-feedback-action">
                  <h4>Report a problem with this question</h4>
                  {feedbackStatus === 'submitted' ? (
                    <p className="feedback-success">Feedback submitted successfully. Thank you!</p>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit}>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Describe what seems incorrect, unclear, or outdated..."
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
