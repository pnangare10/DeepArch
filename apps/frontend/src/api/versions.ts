import { api } from './client';
import type { ProjectVersion } from '@deeparch/shared';

export const versionsApi = {
  list: (projectId: string) => api.get<ProjectVersion[]>(`/projects/${projectId}/versions`),
  create: (projectId: string, name: string) =>
    api.post<ProjectVersion>(`/projects/${projectId}/versions`, { name }),
  restore: (projectId: string, versionId: string) =>
    api.post<{ restored: boolean; backup: ProjectVersion }>(
      `/projects/${projectId}/versions/${versionId}/restore`,
      {},
    ),
  delete: (projectId: string, versionId: string) =>
    api.delete<void>(`/projects/${projectId}/versions/${versionId}`),
};
