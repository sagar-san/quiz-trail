interface ProgressSummaryProps {
  counts: { total: number; attempted: number; correct: number; incorrect: number; saved: number; remaining: number };
  onOpenSummary: () => void;
}

export function ProgressSummary({ counts, onOpenSummary }: ProgressSummaryProps) {
  const percentage = counts.total ? Math.round((counts.attempted / counts.total) * 100) : 0;
  const score = counts.attempted ? `${Math.round((counts.correct / counts.attempted) * 100)}%` : '—';
  const stats = [
    ['Attempted', counts.attempted],
    ['Correct', counts.correct],
    ['Incorrect', counts.incorrect],
    ['Score', score],
    ['Saved', counts.saved],
    ['Remaining', counts.remaining],
  ] as const;

  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <p className="eyebrow" id="progress-start">Your progress</p>
          <h2 id="progress-title">{percentage}% explored</h2>
        </div>
        <div className="progress-heading-actions"><span className="total-count">{counts.total} questions</span><button type="button" onClick={onOpenSummary}>View full summary →</button></div>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Questions attempted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <dl className="stat-grid">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
