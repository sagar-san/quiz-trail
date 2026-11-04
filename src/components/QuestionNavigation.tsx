export interface QuestionNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
}

export function QuestionNavigation({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  compact = false,
}: QuestionNavigationProps) {
  return (
    <nav className={`question-navigation${compact ? ' question-navigation-compact' : ''}`} aria-label={compact ? 'Question shortcuts' : 'Question navigation'}>
      <button type="button" disabled={!hasPrevious} onClick={onPrevious}
        aria-label={compact ? 'Go to previous question' : undefined} title={compact ? 'Previous question' : undefined}>
        <span aria-hidden="true">←</span>{!compact && ' Previous'}
      </button>
      <button type="button" disabled={!hasNext} onClick={onNext}
        aria-label={compact ? 'Go to next question' : undefined} title={compact ? 'Next question' : undefined}>
        {!compact && 'Next '}<span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
