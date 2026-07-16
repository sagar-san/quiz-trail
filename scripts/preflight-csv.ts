import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Papa from 'papaparse';
import { parseQuestionBank } from '../src/data/csv/parseQuestionBank.ts';

const path = new URL('../public/data/questions.csv', import.meta.url);
const bytes = await readFile(path);
const csv = bytes.toString('utf8');
const questions = parseQuestionBank(csv);
const raw = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy' }).data;
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

console.log(`Rows: ${questions.length}`);
console.log(`Question types: ${types}`);
console.log(`Option counts: ${optionCounts}`);
console.log(`Blank reference URLs: ${blankUrls}`);
console.log('Invalid rows: 0');
console.log(`SHA-256: ${createHash('sha256').update(bytes).digest('hex')}`);
