const formatMagic = new Uint8Array([0x51, 0x54, 0x42, 0x31]); // QTB1
const initializationVectorLength = 12;

// This key is intentionally part of the public application. Encryption is a
// download deterrent, not a security boundary: the browser must be able to
// decrypt the bank in order to run the quiz.
export const questionBankEncryptionKey = new Uint8Array([
  0xf2, 0x17, 0x83, 0x4c, 0xa9, 0x6e, 0x50, 0xbd,
  0x33, 0xd8, 0x7a, 0x01, 0xc6, 0x95, 0x42, 0xef,
  0x6b, 0x28, 0xdd, 0x74, 0x0f, 0xb1, 0x9c, 0x56,
  0xe3, 0x8a, 0x45, 0xfa, 0x12, 0x67, 0xb0, 0x39,
]);

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
    questionBankEncryptionKey,
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
