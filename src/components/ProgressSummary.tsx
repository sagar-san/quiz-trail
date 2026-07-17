interface ProgressSummaryProps {
  counts: { total: number; attempted: number; correct: number; incorrect: number; saved: number; remaining: number };
  onOpenSummary: () => void;
}

const stats = [
  ['Attempted', 'attempted'],
  ['Correct', 'correct'],
  ['Incorrect', 'incorrect'],
  ['Saved', 'saved'],
  ['Remaining', 'remaining'],
] as const;

export function ProgressSummary({ counts, onOpenSummary }: ProgressSummaryProps) {
  const percentage = counts.total ? Math.round((counts.attempted / counts.total) * 100) : 0;
  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="progress-title">{percentage}% explored</h2>
        </div>
        <div className="progress-heading-actions"><span className="total-count">{counts.total} questions</span><button type="button" onClick={onOpenSummary}>View full summary →</button></div>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Questions attempted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <dl className="stat-grid">
        {stats.map(([label, key]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{counts[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
