import { api } from './client.js';
import type { Comment, CreateCommentDTO, UpdateCommentDTO } from '@deeparch/shared';

export const commentsApi = {
  list: (projectId: string, nodeId: string) =>
    api.get<Comment[]>(`/projects/${projectId}/nodes/${nodeId}/comments`),

  create: (projectId: string, nodeId: string, data: CreateCommentDTO) =>
    api.post<Comment>(`/projects/${projectId}/nodes/${nodeId}/comments`, data),

  update: (projectId: string, commentId: string, data: UpdateCommentDTO) =>
    api.patch<Comment>(`/projects/${projectId}/comments/${commentId}`, data),

  delete: (projectId: string, commentId: string) =>
    api.delete<void>(`/projects/${projectId}/comments/${commentId}`),
};
