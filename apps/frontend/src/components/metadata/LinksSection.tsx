import { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store';

export function LinksSection() {
  const projectId = useStore((s) => s.projectId);
  const selectedNode = useStore((s) => s.selectedNode);
  const updateMetadata = useStore((s) => s.updateMetadata);

  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  if (!selectedNode || !projectId) return null;

  const links = selectedNode.metadata?.links ?? [];

  const handleUpdate = (updatedLinks: { label: string; url: string }[]) => {
    updateMetadata(projectId, selectedNode.id, { links: updatedLinks });
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    handleUpdate([...links, { label: newLabel.trim() || newUrl.trim(), url: newUrl.trim() }]);
    setNewLabel('');
    setNewUrl('');
  };

  const handleDelete = (index: number) => {
    handleUpdate(links.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Links</p>

      <div className="space-y-1.5">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-1.5 group">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline flex-1 truncate"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
            </a>
            <button
              onClick={() => handleDelete(i)}
              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div className="flex gap-1.5 mt-2">
          <div className="flex-1 space-y-1">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full px-2 py-1 text-xs border border-dashed border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-solid"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="https://..."
              className="w-full px-2 py-1 text-xs border border-dashed border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-solid"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-30 self-end pb-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
