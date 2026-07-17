import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, connectFirestoreEmulator } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  try {
    const content = readFileSync(resolve('.env.local'), 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore if file doesn't exist
  }
}

loadEnv();

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'quiz-trail';
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
  appId: process.env.VITE_FIREBASE_APP_ID || 'mock-app-id',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if emulator is running or requested
const dataMode = process.env.VITE_DATA_MODE || 'local';
if (dataMode === 'firebase-emulator' || process.env.FIRESTORE_EMULATOR_HOST) {
  const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const parts = host.split(':');
  connectFirestoreEmulator(db, parts[0], parseInt(parts[1] || '8080', 10));
  console.log(`Connected to Firestore emulator at ${host}`);
} else {
  console.log(`Connecting to production Firestore project: ${projectId}`);
}

async function exportFeedback() {
  console.log('Fetching feedback from Firestore...');
  const feedbackCollection = collection(db, 'questionFeedback');
  const querySnapshot = await getDocs(feedbackCollection);

  if (querySnapshot.empty) {
    console.log('No feedback documents found in questionFeedback collection.');
    return;
  }

  let markdown = '# Quiz Trail Question Feedback\n\n';
  markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

  querySnapshot.forEach((doc) => {
    const questionId = doc.id;
    const data = doc.data();
    interface FeedbackEntry {
      text: string;
      userId: string;
      submittedAt: string;
    }
    const feedbacks = (data.feedbacks || []) as FeedbackEntry[];

    markdown += `## Question ID: ${questionId}\n\n`;
    markdown += `| Submitted At | User ID | Feedback Text |\n`;
    markdown += `| --- | --- | --- |\n`;

    feedbacks.forEach((entry) => {
      const safeText = entry.text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      markdown += `| ${entry.submittedAt} | ${entry.userId} | ${safeText} |\n`;
    });

    markdown += `\n---\n\n`;
  });

  const outputPath = resolve('feedback_export.md');
  writeFileSync(outputPath, markdown);
  console.log(`Successfully exported feedback to ${outputPath}`);
}

exportFeedback().catch((error) => {
  console.error('Failed to export feedback:', error);
  process.exit(1);
});
