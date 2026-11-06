import { doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { decodeQuestionBank } from './loadQuestionBank';

export async function loadPrivateQuestionBank(firestore: Firestore) {
  // Always consult server rules. Never bundle private content or persist it offline.
  const snapshot = await getDocFromServer(doc(firestore, 'privateQuestionBanks', 'agentic-ai'));
  const data = snapshot.data();
  if (!data || data.format !== 'aes-gcm-v1' || typeof data.asset !== 'string') {
    throw new Error('The PAA question bank is not available yet.');
  }
  const bank = await decodeQuestionBank(Uint8Array.from(atob(data.asset), (value) => value.charCodeAt(0)));
  if (!bank.questions.length || bank.questions.some((question) => !question.questionId.startsWith('PAA-'))) {
    throw new Error('The PAA question bank has an incompatible format.');
  }
  return bank;
}
