import { describe, expect, it } from 'vitest';
import { questions } from '../test/fixtures';
import { buildLearningAnalytics, MINIMUM_SAMPLE_SIZE } from './analytics';

describe('learning analytics', () => {
  it('calculates coverage and expands multi-value objectives and topics', () => {
    const analytics = buildLearningAnalytics(questions, { 'PMLE-0001': true, 'PMLE-0002': false }, ['PMLE-0003']);

    expect(analytics.overall).toMatchObject({ total: 3, answered: 2, correct: 1, missed: 1, accuracy: 50, coverage: 67 });
    expect(analytics.byTopic.find((stat) => stat.label === 'BigQuery')).toMatchObject({ total: 2, answered: 2, accuracy: 50 });
    expect(analytics.byDifficulty.map((stat) => [stat.label, stat.answered])).toEqual([['Easy', 1], ['Medium', 1], ['Hard', 0]]);
    expect(analytics.reviewQueue).toEqual({ incorrect: 1, saved: 1, unanswered: 1, outdated: 0 });
  });

  it('labels exam-section signals only after a meaningful sample', () => {
    const sample = Array.from({ length: MINIMUM_SAMPLE_SIZE }, (_, index) => ({
      ...questions[0], questionId: `S-${index}`, examSection: index === MINIMUM_SAMPLE_SIZE - 1 ? 'Small section' : 'Strong section',
    }));
    const progress = Object.fromEntries(sample.map((question) => [question.questionId, true]));
    expect(buildLearningAnalytics(sample, progress, []).strengths).toEqual([]);

    const eligible = sample.map((question) => ({ ...question, examSection: 'Strong section' }));
    const analytics = buildLearningAnalytics(eligible, progress, []);
    expect(analytics.strengths[0]).toMatchObject({ label: 'Strong section', accuracy: 100, answered: MINIMUM_SAMPLE_SIZE });
  });
});
