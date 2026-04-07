import { useRef, useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { generateArchitecture } from '../../api/ai';
import { useStore } from '../../store';
import { useToast } from '../ui/Toast';
import type { AISSEEvent } from '@deeparch/shared';

interface AIGenerateModalProps {
  projectId: string;
  onClose: () => void;
}

export function AIGenerateModal({ projectId, onClose }: AIGenerateModalProps) {
  const toast = useToast();
  const currentParentId = useStore((s) => s.currentParentId);
  const loadLevel = useStore((s) => s.loadLevel);

  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const abortRef = useRef<(() => void) | null>(null);

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Please enter a description.');
      return;
    }
    if (trimmed.length > 2000) {
      setError('Description must be 2000 characters or fewer.');
      return;
    }

    setError('');
    setStatus('');
    setGenerating(true);

    abortRef.current = generateArchitecture(
      projectId,
      trimmed,
      currentParentId,
      (event: AISSEEvent) => {
        if (event.type === 'status') {
          setStatus(event.message);
        } else if (event.type === 'done') {
          setGenerating(false);
          loadLevel(projectId, currentParentId);
          toast(`Generated ${event.nodeCount} nodes and ${event.edgeCount} connections`, 'success');
          onClose();
        } else if (event.type === 'error') {
          setGenerating(false);
          setError(event.message);
          setStatus('');
        }
      },
    );
  };

  const handleCancel = () => {
    abortRef.current?.();
    setGenerating(false);
    setStatus('');
  };

  const handleClose = () => {
    if (generating) handleCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-800">Generate with AI</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-slate-500">
            Describe your system and Claude will generate an architecture diagram for this level.
          </p>

          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            rows={5}
            placeholder="e.g. A microservices e-commerce platform with an API gateway, user service, product service, order service, and separate PostgreSQL databases for each service"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{prompt.length}/2000</span>
            <span className="text-xs text-slate-400">Ctrl+Enter to generate</span>
          </div>

          {/* Status */}
          {status && !error && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin text-violet-500" />
              {status}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          {generating ? (
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
