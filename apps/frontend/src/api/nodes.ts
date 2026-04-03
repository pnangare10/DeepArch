import { api } from './client';
import type { ArchNode, CreateNodeDTO, UpdateNodeDTO, BatchPositionUpdate } from '@deeparch/shared';

export const nodesApi = {
  getByParent: (projectId: string, parentId: string | null) =>
    api.get<ArchNode[]>(
      `/projects/${projectId}/nodes?parentId=${parentId ?? 'null'}`,
    ),
  create: (projectId: string, data: CreateNodeDTO) =>
    api.post<ArchNode>(`/projects/${projectId}/nodes`, data),
  update: (projectId: string, nodeId: string, data: UpdateNodeDTO) =>
    api.patch<ArchNode>(`/projects/${projectId}/nodes/${nodeId}`, data),
  delete: (projectId: string, nodeId: string) =>
    api.delete<ArchNode>(`/projects/${projectId}/nodes/${nodeId}`),
  batchUpdatePositions: (projectId: string, updates: BatchPositionUpdate[]) =>
    api.patch<void>(`/projects/${projectId}/nodes/batch`, updates),
};
