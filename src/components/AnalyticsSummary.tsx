import { MINIMUM_SAMPLE_SIZE, buildLearningAnalytics, type CategoryStat } from '../domain/analytics';
import type { QuizFilter, QuizQuestion } from '../domain/types';

interface AnalyticsSummaryProps {
  questions: QuizQuestion[];
  progress: Record<string, boolean>;
  savedForLater: string[];
  onBack: () => void;
  onReview: (filter: QuizFilter) => void;
}

const formatAccuracy = (accuracy: number | null) => accuracy === null ? '—' : `${accuracy}%`;

function AnalyticsTable({ title, description, stats, showMissed = false, collapsible = false }: {
  title: string;
  description: string;
  stats: CategoryStat[];
  showMissed?: boolean;
  collapsible?: boolean;
}) {
  const table = (
      <div className="analytics-table-wrap" role="region" aria-label={`${title} table`} tabIndex={0}>
        <table className="analytics-table">
          <thead><tr><th scope="col">Area</th><th scope="col">Accuracy</th><th scope="col">Coverage</th><th scope="col">Answered</th>{showMissed && <th scope="col">Missed</th>}</tr></thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td>{formatAccuracy(stat.accuracy)}</td>
                <td><span className="coverage-value">{stat.coverage}%</span><span className="mini-track" aria-hidden="true"><span style={{ width: `${stat.coverage}%` }} /></span></td>
                <td>{stat.answered} / {stat.total}</td>
                {showMissed && <td>{stat.missed}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
  if (collapsible) return (
    <details className="analytics-card analytics-details">
      <summary><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">＋</span></summary>
      {table}
    </details>
  );
  return <section className="analytics-card"><div className="analytics-section-heading"><div><h2>{title}</h2><p>{description}</p></div></div>{table}</section>;
}

export function AnalyticsSummary({ questions, progress, savedForLater, onBack, onReview }: AnalyticsSummaryProps) {
  const analytics = buildLearningAnalytics(questions, progress, savedForLater);
  const { overall, reviewQueue } = analytics;
  const queueItems: Array<{ label: string; count: number; filter: QuizFilter; note?: string }> = [
    { label: 'Incorrect', count: reviewQueue.incorrect, filter: 'incorrect' },
    { label: 'Starred', count: reviewQueue.saved, filter: 'saved' },
    { label: 'Unanswered', count: reviewQueue.unanswered, filter: 'unanswered' },
  ];

  return (
    <div className="analytics-summary">
      <button type="button" className="summary-back" onClick={onBack}>← Back to practice</button>
      <section className="analytics-hero" aria-labelledby="summary-title">
        <p className="eyebrow">Learning summary</p>
        <h1 id="summary-title">See where you stand.</h1>
        <p>Accuracy reflects your latest recorded answer for each question. Coverage shows how much of the bank you have explored.</p>
        <div className="overall-grid">
          <div><span>Attempted</span><strong>{overall.answered}</strong></div>
          <div><span>Remaining</span><strong>{overall.total - overall.answered}</strong></div>
          <div><span>Accuracy</span><strong>{formatAccuracy(overall.accuracy)}</strong></div>
          <div><span>Coverage</span><strong>{overall.coverage}%</strong></div>
        </div>
      </section>

      <section className="analytics-card" aria-labelledby="signals-title">
        <div className="analytics-section-heading"><div><h2 id="signals-title">Strengths and weak areas</h2><p>Signals appear after at least {MINIMUM_SAMPLE_SIZE} questions in an exam section.</p></div></div>
        {analytics.strengths.length || analytics.weakAreas.length ? (
          <div className="signal-grid">
            <div><h3>Strengths</h3>{analytics.strengths.length ? analytics.strengths.map((stat) => <p key={stat.label}><strong>{stat.label}</strong><span>{stat.accuracy}% accuracy · {stat.answered} answered</span></p>) : <p className="muted-copy">No section has reached the strength threshold yet.</p>}</div>
            <div><h3>Weak areas</h3>{analytics.weakAreas.length ? analytics.weakAreas.map((stat) => <p key={stat.label}><strong>{stat.label}</strong><span>{stat.accuracy}% accuracy · {stat.answered} answered</span></p>) : <p className="muted-copy">No section is currently flagged as weak.</p>}</div>
          </div>
        ) : <p className="muted-copy">Keep practicing. You need a little more coverage before these signals become meaningful.</p>}
      </section>

      <section className="analytics-card" aria-labelledby="queue-title">
        <div className="analytics-section-heading"><div><h2 id="queue-title">Review queue</h2><p>Jump straight to the questions that need attention.</p></div></div>
        <div className="review-queue">
          {queueItems.map((item) => <button type="button" key={item.filter} onClick={() => onReview(item.filter)}><span>{item.label}{item.note && <small>{item.note}</small>}</span><strong>{item.count}</strong></button>)}
        </div>
      </section>

      <AnalyticsTable title="By exam section" description="Official PMLE domains are the primary subject grouping." stats={analytics.byExamSection} />
      <AnalyticsTable title="By objective" description="Questions can contribute to more than one exam objective." stats={analytics.byObjective} collapsible />
      <AnalyticsTable title="By topic" description="Detailed concepts, with missed questions highlighted for review." stats={analytics.byTopic} showMissed collapsible />
      <AnalyticsTable title="By difficulty" description="How your current answers compare across Easy, Medium, and Hard questions." stats={analytics.byDifficulty} />
    </div>
  );
}
