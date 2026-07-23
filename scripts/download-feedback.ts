import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Timestamp } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'quiz-trail';
const app = process.env.FIRESTORE_EMULATOR_HOST
  ? initializeApp({ projectId })
  : initializeApp({ projectId, credential: applicationDefault() });
const db = getFirestore(app);

interface FeedbackEntry {
  questionId: string;
  userId: string;
  text: string;
  submittedAt?: Timestamp;
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

async function exportFeedback() {
  const source = process.env.FIRESTORE_EMULATOR_HOST
    ? `Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `Firestore project ${projectId}`;
  console.log(`Fetching feedback from ${source}...`);

  const snapshot = await db.collectionGroup('submissions').get();
  const feedback = snapshot.docs.flatMap((submission): FeedbackEntry[] => {
    const path = submission.ref.path.split('/');
    if (
      path.length !== 4
      || path[0] !== 'questionFeedback'
      || path[2] !== 'submissions'
    ) return [];
    const questionId = path[1];
    const data = submission.data();
    if (typeof data.text !== 'string') return [];
    return [{
      questionId,
      userId: submission.id,
      text: data.text,
      submittedAt: data.submittedAt,
    }];
  }).sort((left, right) => {
    const questionOrder = left.questionId.localeCompare(right.questionId);
    if (questionOrder !== 0) return questionOrder;
    return (right.submittedAt?.toMillis() ?? 0) - (left.submittedAt?.toMillis() ?? 0);
  });

  if (feedback.length === 0) {
    console.log('No feedback submissions found.');
    return;
  }

  let markdown = '# Quiz Trail Question Feedback\n\n';
  markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

  let currentQuestionId = '';
  for (const entry of feedback) {
    if (entry.questionId !== currentQuestionId) {
      if (currentQuestionId) markdown += '\n---\n\n';
      currentQuestionId = entry.questionId;
      markdown += `## Question ID: ${currentQuestionId}\n\n`;
      markdown += '| Submitted At | User ID | Feedback Text |\n';
      markdown += '| --- | --- | --- |\n';
    }

    const submittedAt = entry.submittedAt?.toDate().toISOString() ?? 'Unknown';
    markdown += `| ${submittedAt} | ${escapeTableCell(entry.userId)} | ${escapeTableCell(entry.text)} |\n`;
  }
  markdown += '\n';

  const outputPath = resolve('feedback_export.md');
  writeFileSync(outputPath, markdown);
  console.log(`Successfully exported ${feedback.length} submission(s) to ${outputPath}`);
}

exportFeedback().catch((error) => {
  console.error('Failed to export feedback:', error);
  process.exitCode = 1;
});
