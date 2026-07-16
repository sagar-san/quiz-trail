import Papa from 'papaparse';
import { choiceKeys, type ChoiceKey, type QuestionType, type QuizQuestion } from '../../domain/types.ts';
import { expectedHeaders, questionCsvRowSchema, type QuestionCsvRow } from './questionCsvSchema.ts';

export class QuestionBankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionBankError';
  }
}

const cleanHeader = (header: string) => header.replace(/^\uFEFF/, '').trim();
const clean = (value: string) => value.trim();

function parseAnswers(value: string): ChoiceKey[] {
  return value
    .split(',')
    .map((answer) => answer.trim().toUpperCase())
    .filter((answer): answer is ChoiceKey => choiceKeys.includes(answer as ChoiceKey));
}

function normalizeRow(row: QuestionCsvRow, rowNumber: number): QuizQuestion {
  const id = clean(row.question_id);
  const type = clean(row.question_type) as QuestionType;
  const prefix = `CSV row ${rowNumber}${id ? ` (${id})` : ''}`;
  if (!id) throw new QuestionBankError(`${prefix}: question_id is required.`);
  if (type !== 'single_choice' && type !== 'multiple_choice') {
    throw new QuestionBankError(`${prefix}: unsupported question_type “${row.question_type}”.`);
  }
  const prompt = clean(row.question);
  const explanation = clean(row.explanation);
  if (!prompt) throw new QuestionBankError(`${prefix}: question is required.`);
  if (!explanation) throw new QuestionBankError(`${prefix}: explanation is required.`);

  const options = choiceKeys
    .map((key) => ({ key, text: clean(row[`option_${key.toLowerCase()}` as keyof QuestionCsvRow]) }))
    .filter((option) => option.text);
  if (options.length < 2) throw new QuestionBankError(`${prefix}: at least two nonblank options are required.`);

  const rawAnswers = clean(row.correct_answer).split(',').map((answer) => answer.trim()).filter(Boolean);
  const correctAnswers = parseAnswers(row.correct_answer);
  const validKeys = new Set(options.map((option) => option.key));
  if (correctAnswers.length !== rawAnswers.length || correctAnswers.some((answer) => !validKeys.has(answer))) {
    throw new QuestionBankError(`${prefix}: correct_answer references a blank or unknown option.`);
  }
  if (type === 'single_choice' && correctAnswers.length !== 1) {
    throw new QuestionBankError(`${prefix}: single_choice requires exactly one correct answer.`);
  }
  if (type === 'multiple_choice' && correctAnswers.length < 2) {
    throw new QuestionBankError(`${prefix}: multiple_choice requires at least two correct answers.`);
  }

  const referenceUrl = clean(row.reference_url);
  if (referenceUrl) {
    try {
      const url = new URL(referenceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new QuestionBankError(`${prefix}: reference_url must be a valid HTTP(S) URL.`);
    }
  }
  const verified = clean(row.chatgpt_verified).toUpperCase();
  if (verified && !['TRUE', 'FALSE'].includes(verified)) {
    throw new QuestionBankError(`${prefix}: chatgpt_verified must be TRUE, FALSE, or blank.`);
  }

  return {
    questionId: id,
    questionType: type,
    prompt,
    options,
    correctAnswers,
    explanation,
    ...(referenceUrl ? { referenceUrl } : {}),
    ...(verified ? { chatgptVerified: verified === 'TRUE' } : {}),
  };
}

export function parseQuestionBank(csv: string): QuizQuestion[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
  });
  if (result.errors.length) {
    const issue = result.errors[0];
    throw new QuestionBankError(`CSV parse error near row ${(issue.row ?? 0) + 2}: ${issue.message}`);
  }
  const fields = result.meta.fields ?? [];
  const missing = expectedHeaders.filter((field) => !fields.includes(field));
  if (missing.length) throw new QuestionBankError(`CSV is missing required headers: ${missing.join(', ')}.`);

  const seen = new Set<string>();
  return result.data.map((raw, index) => {
    const parsed = questionCsvRowSchema.safeParse(raw);
    if (!parsed.success) throw new QuestionBankError(`CSV row ${index + 2}: invalid row shape.`);
    const question = normalizeRow(parsed.data, index + 2);
    if (seen.has(question.questionId)) {
      throw new QuestionBankError(`CSV row ${index + 2} (${question.questionId}): duplicate question_id.`);
    }
    seen.add(question.questionId);
    return question;
  });
}
