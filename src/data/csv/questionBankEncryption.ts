const formatMagic = new Uint8Array([0x51, 0x54, 0x42, 0x31]); // QTB1
const initializationVectorLength = 12;

export const questionBankFormatMagic = formatMagic;

export async function decryptQuestionBank(asset: Uint8Array): Promise<Uint8Array> {
  const minimumLength = formatMagic.length + initializationVectorLength + 16;
  if (
    asset.length < minimumLength
    || formatMagic.some((byte, index) => asset[index] !== byte)
  ) {
    throw new Error('Unsupported encrypted question-bank format.');
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Question-bank decryption requires a secure browser context.');
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new Uint8Array(__QUESTION_BANK_ENCRYPTION_KEY__),
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const initializationVector = asset.slice(
    formatMagic.length,
    formatMagic.length + initializationVectorLength,
  );
  const ciphertextWithTag = asset.slice(formatMagic.length + initializationVectorLength);
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: initializationVector, tagLength: 128 },
    key,
    ciphertextWithTag,
  );
  return new Uint8Array(plaintext);
}
