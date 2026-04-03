import { api } from './client';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@deeparch/shared';

export const projectsApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: CreateProjectDTO) => api.post<Project>('/projects', data),
  update: (id: string, data: UpdateProjectDTO) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<void>(`/projects/${id}`),
};
