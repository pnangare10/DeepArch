import type { StateCreator } from 'zustand';
import type { SearchResult } from '@deeparch/shared';
import { searchApi } from '../api/search';
import type { StoreState } from './index';

export interface SearchSlice {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  isSearchOpen: boolean;
  search: (projectId: string, query: string) => Promise<void>;
  clearSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  navigateToResult: (result: SearchResult) => void;
}

export const createSearchSlice: StateCreator<
  StoreState,
  [],
  [],
  SearchSlice
> = (set, get) => ({
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  isSearchOpen: false,

  search: async (projectId, query) => {
    set({ searchQuery: query, isSearching: true });
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    try {
      const results = await searchApi.search(projectId, query);
      set({ searchResults: results, isSearching: false });
    } catch (err) {
      console.error('Search failed:', err);
      set({ isSearching: false });
    }
  },

  clearSearch: () =>
    set({ searchQuery: '', searchResults: [], isSearchOpen: false }),

  setSearchOpen: (open) => set({ isSearchOpen: open }),

  navigateToResult: (result) => {
    const { projectId } = get();
    if (!projectId) return;

    // Set breadcrumbs from the result's path
    set({
      breadcrumbs: [...result.path],
      currentParentId: result.parentId,
      isSearchOpen: false,
      searchQuery: '',
      searchResults: [],
    });

    // Load the level containing this node
    get().loadLevel(projectId, result.parentId);
  },
});
