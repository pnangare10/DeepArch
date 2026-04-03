import { useEffect, useRef, useState } from 'react';
import { Search, FolderInput, Copy, X } from 'lucide-react';
import { searchApi } from '../../api/search';
import { useStore } from '../../store';
import type { SearchResult } from '@deeparch/shared';

interface MoveNodeModalProps {
  projectId: string;
  nodeId: string;
  nodeName: string;
  mode: 'move' | 'copy';
  onClose: () => void;
}

export function MoveNodeModal({ projectId, nodeId, nodeName, mode, onClose }: MoveNodeModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const reparentNode = useStore((s) => s.reparentNode);
  const copyToLevel = useStore((s) => s.copyToLevel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search for target nodes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.search(projectId, query);
        // Exclude the node being moved itself
        setResults(res.filter((r) => r.nodeId !== nodeId));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, projectId, nodeId]);

  const handleConfirm = async (newParentId: string | null) => {
    if (mode === 'move') {
      await reparentNode(projectId, nodeId, newParentId);
    } else {
      await copyToLevel(projectId, nodeId, newParentId);
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onMouseDown={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {mode === 'move'
              ? <FolderInput className="w-4 h-4 text-blue-600" />
              : <Copy className="w-4 h-4 text-emerald-600" />
            }
            <span className="text-sm font-semibold text-slate-800">
              {mode === 'move' ? 'Move' : 'Copy'} "{nodeName}" to…
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Root level option */}
        <div className="px-4 py-2 border-b border-slate-100">
          <button
            onClick={() => handleConfirm(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-left"
          >
            <span className="text-slate-400 font-mono text-xs">/</span>
            Root level
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a parent node…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
          )}
          {!isSearching && query && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No nodes found</div>
          )}
          {!isSearching && !query && (
            <div className="px-4 py-3 text-sm text-slate-400">
              Type to search for a parent node
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.nodeId}
              onClick={() => handleConfirm(result.nodeId)}
              className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800">{result.name}</span>
              {result.path.length > 0 && (
                <span className="text-xs text-slate-400">
                  {result.path.map((p) => p.name).join(' › ')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
