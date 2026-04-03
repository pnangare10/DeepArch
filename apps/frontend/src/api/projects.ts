import { api } from './client';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@deeparch/shared';

export const projectsApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: CreateProjectDTO) => api.post<Project>('/projects', data),
  update: (id: string, data: UpdateProjectDTO) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<void>(`/projects/${id}`),

  exportProject: async (id: string, projectName: string): Promise<void> => {
    const data = await api.get<unknown>(`/projects/${id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-deeparch.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importProject: (data: unknown) => api.post<Project>('/projects/import', data),
};
