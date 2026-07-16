import { useState } from 'react';
import type { ChoiceKey, QuizQuestion } from '../domain/types';

interface QuestionCardProps {
  question: QuizQuestion;
  position: number;
  total: number;
  saved: boolean;
  priorOutcome?: boolean;
  onSubmit: (correct: boolean) => void;
  onToggleSaved: () => void;
}

const sameAnswers = (selected: ChoiceKey[], correct: ChoiceKey[]) =>
  selected.length === correct.length && selected.every((answer) => correct.includes(answer));

export function QuestionCard({ question, position, total, saved, priorOutcome, onSubmit, onToggleSaved }: QuestionCardProps) {
  const [selected, setSelected] = useState<ChoiceKey[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const multiple = question.questionType === 'multiple_choice';
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
        </div>
      )}
    </article>
  );
}
