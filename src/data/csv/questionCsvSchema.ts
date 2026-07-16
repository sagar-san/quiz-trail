import { z } from 'zod';

export const expectedHeaders = [
  'question_id',
  'question_type',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_e',
  'correct_answer',
  'explanation',
  'reference_url',
  'chatgpt_verified',
] as const;

export const questionCsvRowSchema = z.object({
  question_id: z.string(),
  question_type: z.string(),
  question: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  option_e: z.string(),
  correct_answer: z.string(),
  explanation: z.string(),
  reference_url: z.string(),
  chatgpt_verified: z.string(),
});

export type QuestionCsvRow = z.infer<typeof questionCsvRowSchema>;
