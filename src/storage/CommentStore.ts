export type Reaction = 'like' | 'dislike' | null;
export interface CommentScope { certificationId: 'pmle' | 'agentic-ai'; questionId: string }
// Adapter-owned cursor: callers must pass it back unchanged.
export interface CommentCursor { readonly token: unknown }
export interface QuestionComment {
  id: string; authorUid: string | null; authorName: string; text: string;
  createdAt: number; edited: boolean; likeCount: number; dislikeCount: number;
  score: number; reaction: Reaction;
}
export interface CommentPage {
  items: QuestionComment[]; nextCursor?: CommentCursor; hasNext: boolean;
  writesEnabled: boolean; deletionPending: boolean;
}
export interface CommentStore {
  listPage(uid: string, scope: CommentScope, cursor?: CommentCursor): Promise<CommentPage>;
  createComment(uid: string, scope: CommentScope, text: string, authorName: string, id: string): Promise<void>;
  editComment(uid: string, id: string, text: string): Promise<void>;
  deleteComment(uid: string, id: string): Promise<void>;
  setReaction(uid: string, id: string, desired: Reaction): Promise<Pick<QuestionComment, 'likeCount' | 'dislikeCount' | 'score' | 'reaction'>>;
  deleteUserCommentData(uid: string): Promise<void>;
}
export function commentText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 2000) throw new Error('Enter a comment between 1 and 2,000 characters.');
  return trimmed;
}
export function publicCommentName(name?: string): string {
  return name?.trim() && !name.includes('@') ? name.trim().slice(0, 80) : 'Learner';
}
