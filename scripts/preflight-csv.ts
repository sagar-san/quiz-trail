import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import { parseQuestionBank } from '../src/data/csv/parseQuestionBank.ts';

const args = process.argv.slice(2);
let candidatePath: string | undefined;
let comparePath: string | undefined;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--compare') {
    comparePath = args[index + 1];
    if (!comparePath) throw new Error('--compare requires a CSV path.');
    index += 1;
  } else if (!candidatePath) {
    candidatePath = args[index];
  } else {
    throw new Error('Usage: npm run preflight -- [candidate.csv] [--compare baseline.csv]');
  }
}

const inputPath = resolve(
  candidatePath
  ?? process.env.QUESTION_BANK_PATH
  ?? '../quiz-trail-question-bank/questions.csv',
);
const bytes = await readFile(inputPath);
const csv = bytes.toString('utf8');
const questions = parseQuestionBank(csv);
const parseRaw = (value: string) => Papa.parse<Record<string, string>>(value, {
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
}).data;
const raw = parseRaw(csv);
const typesByName = questions.reduce<Record<string, number>>((counts, question) => {
  counts[question.questionType] = (counts[question.questionType] ?? 0) + 1;
  return counts;
}, {});
const optionsByCount = questions.reduce<Record<string, number>>((counts, question) => {
  const count = String(question.options.length);
  counts[count] = (counts[count] ?? 0) + 1;
  return counts;
}, {});
const types = Object.entries(typesByName)
  .map(([type, count]) => `${type}: ${count}`)
  .join(', ');
const optionCounts = Object.entries(optionsByCount)
  .map(([count, rows]) => `${count} options: ${rows}`)
  .join(', ');
const blankUrls = raw.filter((row) => !row.reference_url?.trim()).length;

console.log(`File: ${inputPath}`);
console.log(`Rows: ${questions.length}`);
console.log(`Question types: ${types}`);
console.log(`Option counts: ${optionCounts}`);
console.log(`Blank reference URLs: ${blankUrls}`);
console.log('Invalid rows: 0');
console.log(`SHA-256: ${createHash('sha256').update(bytes).digest('hex')}`);

if (comparePath) {
  const baselineFullPath = resolve(comparePath);
  const baselineCsv = await readFile(baselineFullPath, 'utf8');
  parseQuestionBank(baselineCsv);
  const baseline = parseRaw(baselineCsv);
  const candidateById = new Map(raw.map((row) => [row.question_id.trim(), row]));
  const baselineById = new Map(baseline.map((row) => [row.question_id.trim(), row]));
  const added = [...candidateById.keys()].filter((id) => !baselineById.has(id));
  const removed = [...baselineById.keys()].filter((id) => !candidateById.has(id));
  const common = [...candidateById.keys()].filter((id) => baselineById.has(id));
  const optionText = (row: Record<string, string>, key: string) => row[`option_${key.toLowerCase()}`]?.trim() ?? '';
  const answerText = (row: Record<string, string>) => row.correct_answer
    .split(',')
    .map((key) => optionText(row, key.trim()))
    .sort()
    .join('\n');
  const promptChanges: string[] = [];
  const answerKeyChanges: string[] = [];
  const answerTextChanges: string[] = [];
  for (const id of common) {
    const candidate = candidateById.get(id)!;
    const prior = baselineById.get(id)!;
    if (candidate.question !== prior.question) promptChanges.push(id);
    if (candidate.correct_answer !== prior.correct_answer) answerKeyChanges.push(id);
    if (answerText(candidate) !== answerText(prior)) answerTextChanges.push(id);
  }

  console.log(`Comparison baseline: ${baselineFullPath}`);
  console.log(`Added IDs (${added.length}): ${added.join(', ') || 'none'}`);
  console.log(`Removed IDs (${removed.length}): ${removed.join(', ') || 'none'}`);
  console.log(`Changed prompts (${promptChanges.length}): ${promptChanges.join(', ') || 'none'}`);
  console.log(`Changed answer keys (${answerKeyChanges.length}): ${answerKeyChanges.join(', ') || 'none'}`);
  console.log(`Changed correct-answer text (${answerTextChanges.length}): ${answerTextChanges.join(', ') || 'none'}`);
}
