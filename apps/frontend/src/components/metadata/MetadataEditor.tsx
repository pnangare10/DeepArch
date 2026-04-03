import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store';

export function MetadataEditor() {
  const projectId = useStore((s) => s.projectId);
  const selectedNode = useStore((s) => s.selectedNode);
  const updateMetadata = useStore((s) => s.updateMetadata);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  if (!selectedNode || !projectId) return null;

  const fields = selectedNode.metadata?.customFields ?? [];

  const handleUpdate = (updatedFields: { key: string; value: string }[]) => {
    updateMetadata(projectId, selectedNode.id, {
      customFields: updatedFields,
    });
  };

  const handleFieldChange = (index: number, key: string, value: string) => {
    const updated = fields.map((f, i) => (i === index ? { key, value } : f));
    handleUpdate(updated);
  };

  const handleDelete = (index: number) => {
    handleUpdate(fields.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    handleUpdate([...fields, { key: newKey.trim(), value: newValue }]);
    setNewKey('');
    setNewValue('');
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Custom Fields</p>

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              value={field.key}
              onChange={(e) => handleFieldChange(i, e.target.value, field.value)}
              placeholder="Key"
              className="w-2/5 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              value={field.value}
              onChange={(e) => handleFieldChange(i, field.key, e.target.value)}
              placeholder="Value"
              className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleDelete(i)}
              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <div className="flex gap-1.5 items-center">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New key"
            className="w-2/5 px-2 py-1 text-xs border border-dashed border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-solid"
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Value"
            className="flex-1 px-2 py-1 text-xs border border-dashed border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-solid"
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim()}
            className="text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0 disabled:opacity-30"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
