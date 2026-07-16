export function QuestionNavigation({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="question-navigation" aria-label="Question navigation">
      <button type="button" disabled={!hasPrevious} onClick={onPrevious}><span aria-hidden="true">←</span> Previous</button>
      <button type="button" disabled={!hasNext} onClick={onNext}>Next <span aria-hidden="true">→</span></button>
    </nav>
  );
}
