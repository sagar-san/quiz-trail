import type { QuizFilter } from '../domain/types';

const filters: Array<{ value: QuizFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'saved', label: 'Saved' },
  { value: 'outdated', label: 'Outdated' },
];

export function QuizFilters({ active, onChange }: { active: QuizFilter; onChange: (filter: QuizFilter) => void }) {
  return (
    <div className="filter-wrap">
      <div className="segmented-control" aria-label="Question view">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={active === filter.value}
            onClick={() => onChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <label className="filter-select">
        <span>Question view</span>
        <select value={active} onChange={(event) => onChange(event.target.value as QuizFilter)}>
          {filters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
      </label>
    </div>
  );
}
