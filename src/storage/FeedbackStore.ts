export interface FeedbackStore {
  loadFeedback(questionId: string, userId: string): Promise<string | null>;
  submitFeedback(questionId: string, feedbackText: string, userId: string): Promise<void>;
}
