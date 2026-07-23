export interface FeedbackStore {
  submitFeedback(questionId: string, feedbackText: string, userId: string): Promise<void>;
}
