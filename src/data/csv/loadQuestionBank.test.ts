import { afterEach, describe, expect, it, vi } from 'vitest';
import { questions } from '../../test/fixtures';
import { hashCsv, shuffleQuestions } from './loadQuestionBank';
import {
  decryptQuestionBank,
  questionBankEncryptionKey,
  questionBankFormatMagic,
} from './questionBankEncryption';

afterEach(() => vi.unstubAllGlobals());

describe('shuffleQuestions', () => {
  it('returns a shuffled copy without changing IDs or mutating the source', () => {
    const originalIds = questions.map((question) => question.questionId);
    const shuffled = shuffleQuestions(questions, () => 0);

    expect(shuffled.map((question) => question.questionId)).toEqual(['PMLE-0002', 'PMLE-0003', 'PMLE-0001']);
    expect(shuffled.map((question) => question.questionId).sort()).toEqual([...originalIds].sort());
    expect(questions.map((question) => question.questionId)).toEqual(originalIds);
  });

  it('uses a deterministic fallback when Web Crypto is unavailable on local HTTP', async () => {
    vi.stubGlobal('crypto', {});
    const bytes = new TextEncoder().encode('question bank');
    expect(await hashCsv(bytes)).toBe(await hashCsv(bytes));
    expect(await hashCsv(bytes)).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });
});

describe('question-bank encryption', () => {
  it('decrypts an AES-GCM question-bank asset', async () => {
    const plaintext = new TextEncoder().encode('question bank');
    const initializationVector = new Uint8Array(12).fill(7);
    const key = await crypto.subtle.importKey(
      'raw',
      questionBankEncryptionKey,
      'AES-GCM',
      false,
      ['encrypt'],
    );
    const ciphertextWithTag = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: initializationVector, tagLength: 128 },
      key,
      plaintext,
    ));
    const asset = new Uint8Array(
      questionBankFormatMagic.length + initializationVector.length + ciphertextWithTag.length,
    );
    asset.set(questionBankFormatMagic);
    asset.set(initializationVector, questionBankFormatMagic.length);
    asset.set(ciphertextWithTag, questionBankFormatMagic.length + initializationVector.length);

    const decrypted = await decryptQuestionBank(asset);
    expect([...decrypted]).toEqual([...plaintext]);
  });

  it('rejects an unsupported encrypted asset', async () => {
    await expect(decryptQuestionBank(new Uint8Array([1, 2, 3]))).rejects.toThrow('Unsupported');
  });
});
