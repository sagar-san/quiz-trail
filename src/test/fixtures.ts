import type { QuizQuestion } from '../domain/types';

export const questions: QuizQuestion[] = [
  {
    questionId: 'PMLE-0001', questionType: 'single_choice', prompt: 'Choose the managed analytics store.',
    options: [{ key: 'A', text: 'BigQuery' }, { key: 'B', text: 'Cloud Storage' }],
    correctAnswers: ['A'], explanation: 'BigQuery is the analytics warehouse.', referenceUrl: 'https://cloud.google.com/bigquery', chatgptVerified: true,
    examSection: 'Building ML solutions', examObjectives: ['Choosing data stores'], topics: ['BigQuery'], difficulty: 'Easy', questionSource: 'Original Bank', reviewStatus: 'Verified', isOutdated: false, terminologyStatus: 'Current', terminologyNotes: '',
  },
  {
    questionId: 'PMLE-0002', questionType: 'multiple_choice', prompt: 'Choose both managed services.',
    options: [{ key: 'A', text: 'Vertex AI' }, { key: 'B', text: 'BigQuery' }, { key: 'C', text: 'A laptop' }],
    correctAnswers: ['A', 'B'], explanation: 'Vertex AI and BigQuery are managed services.', chatgptVerified: true,
    examSection: 'Building ML solutions', examObjectives: ['Choosing managed services'], topics: ['Vertex AI', 'BigQuery'], difficulty: 'Medium', questionSource: 'Generated 2026', reviewStatus: 'Updated 2026', isOutdated: false, terminologyStatus: 'Updated', terminologyNotes: 'AI Platform is now Vertex AI.',
  },
  {
    questionId: 'PMLE-0003', questionType: 'single_choice', prompt: 'Choose one.',
    options: [{ key: 'A', text: 'Wrong' }, { key: 'B', text: 'Right' }],
    correctAnswers: ['B'], explanation: 'B is right.', chatgptVerified: true,
    examSection: 'Monitoring ML solutions', examObjectives: ['Troubleshooting'], topics: ['Monitoring'], difficulty: 'Hard', questionSource: 'Original Bank', reviewStatus: 'Needs Review', isOutdated: true, terminologyStatus: 'Not reviewed', terminologyNotes: 'Confirm current service name.',
  },
];
