export interface FeedbackEntry {
  text: string;
  userId: string;
  submittedAt: string; // ISO date-time string
}

export interface FeedbackStore {
  submitFeedback(questionId: string, feedbackText: string, userId: string): Promise<void>;
}

export class LocalFeedbackStore implements FeedbackStore {
  async submitFeedback(questionId: string, feedbackText: string, userId: string): Promise<void> {
    const key = 'quizTrail.feedback.local';
    let data: Record<string, FeedbackEntry[]> = {};
    
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        data = JSON.parse(raw);
      }
    } catch {
      // Ignore reading error, start fresh or overwrite
    }

    if (!data[questionId]) {
      data[questionId] = [];
    }

    data[questionId].push({
      text: feedbackText,
      userId,
      submittedAt: new Date().toISOString(),
    });

    localStorage.setItem(key, JSON.stringify(data));
  }
}
