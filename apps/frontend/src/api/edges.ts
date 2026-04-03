import { api } from './client';
import type { ArchEdge, CreateEdgeDTO, UpdateEdgeDTO } from '@deeparch/shared';

export const edgesApi = {
  getByParent: (projectId: string, parentId: string | null) =>
    api.get<ArchEdge[]>(
      `/projects/${projectId}/edges?parentId=${parentId ?? 'null'}`,
    ),
  create: (projectId: string, data: CreateEdgeDTO) =>
    api.post<ArchEdge>(`/projects/${projectId}/edges`, data),
  update: (projectId: string, edgeId: string, data: UpdateEdgeDTO) =>
    api.patch<ArchEdge>(`/projects/${projectId}/edges/${edgeId}`, data),
  delete: (projectId: string, edgeId: string) =>
    api.delete<void>(`/projects/${projectId}/edges/${edgeId}`),
};
