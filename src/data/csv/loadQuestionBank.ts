import type { QuizQuestion } from '../../domain/types';
import { parseQuestionBank, QuestionBankError } from './parseQuestionBank';

export interface LoadedQuestionBank {
  questions: QuizQuestion[];
  version: string;
}

export function shuffleQuestions(questions: QuizQuestion[], random: () => number = Math.random): QuizQuestion[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export async function hashCsv(bytes: Uint8Array): Promise<string> {
  // Web Crypto is unavailable on insecure LAN origins (for example, opening
  // the local dev server from a phone over HTTP). Production HTTPS continues
  // to use SHA-256; the fallback is only a deterministic bank-version marker.
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex.slice(0, 12)}`;
  }

  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function loadQuestionBank(url = '/data/questions.csv'): Promise<LoadedQuestionBank> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new QuestionBankError('The question bank could not be downloaded. Check your connection and try again.');
  }
  if (!response.ok) throw new QuestionBankError(`The question bank could not be loaded (HTTP ${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const csv = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { questions: shuffleQuestions(parseQuestionBank(csv)), version: await hashCsv(bytes) };
}
