import { PrismaCommentRepository } from '../repositories/prisma/PrismaCommentRepository.js';
import type { CommentRecord } from '../repositories/interfaces/ICommentRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertMember, getMemberRole } from './memberService.js';

const repo = new PrismaCommentRepository();

export async function listComments(
  projectId: string,
  nodeId: string,
  userId: string,
): Promise<CommentRecord[]> {
  await assertMember(projectId, userId);
  return repo.findByNode(nodeId);
}

export async function createComment(
  projectId: string,
  nodeId: string,
  userId: string,
  text: string,
): Promise<CommentRecord> {
  await assertMember(projectId, userId);
  if (!text?.trim()) throw new AppError(400, 'Comment text is required');
  return repo.create(nodeId, projectId, userId, text.trim());
}

export async function updateComment(
  projectId: string,
  commentId: string,
  userId: string,
  text: string,
): Promise<CommentRecord> {
  await assertMember(projectId, userId);
  const comment = await repo.findById(commentId);
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.userId !== userId) throw new AppError(403, 'You can only edit your own comments');
  if (!text?.trim()) throw new AppError(400, 'Comment text is required');
  return repo.update(commentId, text.trim());
}

export async function deleteComment(
  projectId: string,
  commentId: string,
  userId: string,
): Promise<void> {
  const role = await assertMember(projectId, userId);
  const comment = await repo.findById(commentId);
  if (!comment) throw new AppError(404, 'Comment not found');
  // Own comment or project owner can delete
  if (comment.userId !== userId && role !== 'owner') {
    throw new AppError(403, 'You can only delete your own comments');
  }
  await repo.delete(commentId);
}
