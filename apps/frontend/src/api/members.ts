import { api } from './client.js';
import type { ProjectMember, InviteMemberDTO, UpdateMemberDTO } from '@deeparch/shared';

export const membersApi = {
  list: (projectId: string) =>
    api.get<ProjectMember[]>(`/projects/${projectId}/members`),

  invite: (projectId: string, data: InviteMemberDTO) =>
    api.post<ProjectMember>(`/projects/${projectId}/members`, data),

  changeRole: (projectId: string, userId: string, data: UpdateMemberDTO) =>
    api.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, data),

  remove: (projectId: string, userId: string) =>
    api.delete<void>(`/projects/${projectId}/members/${userId}`),
};
