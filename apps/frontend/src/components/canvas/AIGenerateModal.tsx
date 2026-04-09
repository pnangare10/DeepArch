import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, Plus, Trash2, FileText, MessageSquare } from 'lucide-react';
import { generateArchitecture } from '../../api/ai';
import { useStore } from '../../store';
import { useToast } from '../ui/Toast';
import type { AISSEEvent } from '@deeparch/shared';

interface AIGenerateModalProps {
  projectId: string;
  onClose: () => void;
}

type Mode = 'quick' | 'docs';

interface DocSection {
  id: string;
  title: string;
  content: string;
}

const QUICK_LIMIT = 2000;
const DOCS_LIMIT = 10000;
const MAX_SECTIONS = 5;

const DOC_TITLE_PLACEHOLDERS = [
  'e.g. Service README',
  'e.g. API Specification',
  'e.g. Database Schema',
  'e.g. Deployment Config',
  'e.g. Architecture Notes',
];

export function AIGenerateModal({ projectId, onClose }: AIGenerateModalProps) {
  const toast = useToast();
  const currentParentId = useStore((s) => s.currentParentId);
  const loadLevel = useStore((s) => s.loadLevel);

  const [mode, setMode] = useState<Mode>('quick');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [sections, setSections] = useState<DocSection[]>([
    { id: '1', title: '', content: '' },
  ]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const abortRef = useRef<(() => void) | null>(null);

  const docsCharCount = sections.reduce((sum, s) => sum + s.content.length, 0);
  const docsNearLimit = docsCharCount > DOCS_LIMIT * 0.9;
  const docsOverLimit = docsCharCount > DOCS_LIMIT;

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((prev) => [
      ...prev,
      { id: String(Date.now()), title: '', content: '' },
    ]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const buildPrompt = (): string => {
    if (mode === 'quick') return quickPrompt.trim();
    return sections
      .filter((s) => s.content.trim())
      .map((s) => `[DOCUMENT: ${s.title.trim() || 'Untitled'}]\n${s.content.trim()}\n[/DOCUMENT]`)
      .join('\n\n');
  };

  const validate = (): string | null => {
    if (mode === 'quick') {
      const trimmed = quickPrompt.trim();
      if (!trimmed) return 'Please enter a description.';
      if (trimmed.length > QUICK_LIMIT) return `Description must be ${QUICK_LIMIT} characters or fewer.`;
      return null;
    }
    const filled = sections.filter((s) => s.content.trim());
    if (filled.length === 0) return 'Please add content to at least one document section.';
    if (docsOverLimit) return `Total content must be ${DOCS_LIMIT.toLocaleString()} characters or fewer.`;
    return null;
  };

  const handleGenerate = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setStatus('');
    setGenerating(true);

    const prompt = buildPrompt();
    abortRef.current = generateArchitecture(
      projectId,
      prompt,
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
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

        {/* Mode toggle */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <p className="text-xs text-slate-500 mb-3">
            Describe your system or paste existing documentation — Claude will extract components, connections, and metadata.
          </p>
          <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => { setMode('quick'); setError(''); }}
              disabled={generating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'quick'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare size={12} />
              Quick Description
            </button>
            <button
              onClick={() => { setMode('docs'); setError(''); }}
              disabled={generating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'docs'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={12} />
              Paste Documentation
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {mode === 'quick' ? (
            <>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                rows={5}
                placeholder="e.g. A microservices e-commerce platform with an API gateway, user service, product service, order service, and separate PostgreSQL databases for each service"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                disabled={generating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{quickPrompt.length}/{QUICK_LIMIT}</span>
                <span className="text-xs text-slate-400">Ctrl+Enter to generate</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Add one section per document. The AI will extract components, connections, metadata (ports, env vars, URLs), and create sticky notes for architectural decisions and warnings.
              </p>

              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <FileText size={12} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        className="flex-1 text-xs text-slate-700 bg-transparent outline-none placeholder-slate-400 font-medium"
                        placeholder={DOC_TITLE_PLACEHOLDERS[index] ?? 'Document title'}
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        disabled={generating}
                      />
                      {sections.length > 1 && (
                        <button
                          onClick={() => removeSection(section.id)}
                          disabled={generating}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <textarea
                      className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-300"
                      rows={5}
                      placeholder="Paste the document content here…"
                      value={section.content}
                      onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                      disabled={generating}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={addSection}
                  disabled={generating || sections.length >= MAX_SECTIONS}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={12} />
                  Add document ({sections.length}/{MAX_SECTIONS})
                </button>
                <span className={`text-xs ${docsOverLimit ? 'text-red-500 font-medium' : docsNearLimit ? 'text-amber-500' : 'text-slate-400'}`}>
                  {docsCharCount.toLocaleString()}/{DOCS_LIMIT.toLocaleString()} chars
                </span>
              </div>
            </>
          )}

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
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
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
            disabled={generating || (mode === 'quick' ? !quickPrompt.trim() : sections.every((s) => !s.content.trim()))}
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
    </div>,
    document.body,
  );
}
