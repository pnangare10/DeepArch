import { useEffect, useRef, useState } from 'react';
import { Search, X, Layers } from 'lucide-react';
import { useStore } from '../../store';
import { useDebounce } from '../../hooks/useDebounce';
import type { SearchResult } from '@deeparch/shared';

interface SearchBarProps {
  projectId: string;
}

export function SearchBar({ projectId }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchQuery = useStore((s) => s.searchQuery);
  const searchResults = useStore((s) => s.searchResults);
  const isSearching = useStore((s) => s.isSearching);
  const isSearchOpen = useStore((s) => s.isSearchOpen);
  const search = useStore((s) => s.search);
  const clearSearch = useStore((s) => s.clearSearch);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const navigateToResult = useStore((s) => s.navigateToResult);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 300);

  useEffect(() => {
    if (debouncedQuery) {
      search(projectId, debouncedQuery);
      setSearchOpen(true);
    } else {
      clearSearch();
    }
  }, [debouncedQuery, projectId, search, clearSearch, setSearchOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchOpen]);

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    inputRef.current?.focus();
  };

  const handleResultClick = (result: SearchResult) => {
    navigateToResult(result);
    setLocalQuery('');
  };

  return (
    <div className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={() => localQuery && setSearchOpen(true)}
          placeholder="Search nodes..."
          className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isSearchOpen && localQuery && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto"
        >
          {isSearching && (
            <div className="px-3 py-2 text-sm text-slate-400">Searching...</div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No results for "{localQuery}"</div>
          )}

          {!isSearching &&
            searchResults.map((result) => (
              <button
                key={result.nodeId}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {result.name}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 truncate pl-5">
                  {result.path.map((p) => (p.id === null ? 'Root' : p.name)).join(' › ')}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
