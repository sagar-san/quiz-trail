import type { QuizQuestion } from '../domain/types';

export const questions: QuizQuestion[] = [
  {
    questionId: 'PMLE-0001', questionType: 'single_choice', prompt: 'Choose the managed analytics store.',
    options: [{ key: 'A', text: 'BigQuery' }, { key: 'B', text: 'Cloud Storage' }],
    correctAnswers: ['A'], explanation: 'BigQuery is the analytics warehouse.', referenceUrl: 'https://cloud.google.com/bigquery', chatgptVerified: true,
  },
  {
    questionId: 'PMLE-0002', questionType: 'multiple_choice', prompt: 'Choose both managed services.',
    options: [{ key: 'A', text: 'Vertex AI' }, { key: 'B', text: 'BigQuery' }, { key: 'C', text: 'A laptop' }],
    correctAnswers: ['A', 'B'], explanation: 'Vertex AI and BigQuery are managed services.', chatgptVerified: true,
  },
  {
    questionId: 'PMLE-0003', questionType: 'single_choice', prompt: 'Choose one.',
    options: [{ key: 'A', text: 'Wrong' }, { key: 'B', text: 'Right' }],
    correctAnswers: ['B'], explanation: 'B is right.', chatgptVerified: true,
  },
];
