import { describe, expect, it } from 'vitest';
import { parseQuestionBank } from './parseQuestionBank';

const headers = 'question_id,question_type,question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,reference_url,chatgpt_verified,terminology_status,terminology_notes,exam_section,exam_objectives,topics,difficulty,question_source,review_status,is_outdated';
const row = (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    question_id: 'PMLE-1', question_type: 'single_choice', question: 'Prompt', option_a: 'One', option_b: 'Two',
    option_c: '', option_d: '', option_e: '', correct_answer: 'A', explanation: 'Because', reference_url: '', chatgpt_verified: 'TRUE',
    terminology_status: 'Current', terminology_notes: '', exam_section: 'Building ML solutions', exam_objectives: 'Objective one; Objective two',
    topics: 'BigQuery; Data quality', difficulty: 'Medium', question_source: 'Original Bank', review_status: 'Verified', is_outdated: 'FALSE', ...overrides,
  };
  return [headers, Object.values(values).map((value) => `"${value.replaceAll('"', '""')}"`).join(',')].join('\n');
};

describe('parseQuestionBank', () => {
  it('parses single choice, whitespace, multiline content, and optional fields', () => {
    const [question] = parseQuestionBank('\uFEFF' + row({ question: 'Line 1\nLine 2', option_c: 'Three', reference_url: 'https://example.com', chatgpt_verified: 'false' }));
    expect(question).toMatchObject({ questionId: 'PMLE-1', prompt: 'Line 1\nLine 2', correctAnswers: ['A'], chatgptVerified: false });
    expect(question.options).toHaveLength(3);
    expect(question.examObjectives).toEqual(['Objective one', 'Objective two']);
    expect(question.topics).toEqual(['BigQuery', 'Data quality']);
  });

  it('parses multiple choice answer sets', () => {
    const [question] = parseQuestionBank(row({ question_type: 'multiple_choice', option_c: 'Three', correct_answer: 'A, C' }));
    expect(question.correctAnswers).toEqual(['A', 'C']);
  });

  it.each([
    [{ question_id: '' }, 'question_id'],
    [{ question_type: 'essay' }, 'unsupported'],
    [{ question: '' }, 'question is required'],
    [{ explanation: '' }, 'explanation is required'],
    [{ option_b: '' }, 'at least two'],
    [{ correct_answer: 'E' }, 'unknown option'],
    [{ correct_answer: 'A,B' }, 'exactly one'],
    [{ question_type: 'multiple_choice', correct_answer: 'A' }, 'at least two'],
    [{ reference_url: 'javascript:alert(1)' }, 'valid HTTP'],
    [{ chatgpt_verified: 'maybe' }, 'TRUE, FALSE'],
    [{ exam_section: '' }, 'exam_section'],
    [{ exam_objectives: '' }, 'exam_objectives'],
    [{ topics: '' }, 'topics'],
    [{ difficulty: 'Extreme' }, 'difficulty'],
    [{ question_source: '' }, 'question_source'],
    [{ review_status: '' }, 'review_status'],
    [{ is_outdated: '' }, 'is_outdated'],
  ])('rejects invalid rows %#', (overrides, message) => {
    expect(() => parseQuestionBank(row(overrides))).toThrow(message);
  });

  it('rejects duplicates, missing headers, and malformed CSV', () => {
    const valid = row().split('\n')[1];
    expect(() => parseQuestionBank(`${headers}\n${valid}\n${valid}`)).toThrow('duplicate');
    expect(() => parseQuestionBank('question_id,question\n1,test')).toThrow('missing required headers');
    expect(() => parseQuestionBank(`${headers}\n"unterminated`)).toThrow('parse error');
  });
});
