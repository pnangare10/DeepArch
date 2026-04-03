import { api } from './client';
import type { SearchResult } from '@deeparch/shared';

export const searchApi = {
  search: (projectId: string, query: string) =>
    api.get<SearchResult[]>(`/projects/${projectId}/search?q=${encodeURIComponent(query)}`),
};
