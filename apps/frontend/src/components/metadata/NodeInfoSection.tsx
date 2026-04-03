import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { NodeTypePicker } from '../ui/NodeTypePicker';

export function NodeInfoSection() {
  const projectId = useStore((s) => s.projectId);
  const selectedNode = useStore((s) => s.selectedNode);
  const updateNodeInfo = useStore((s) => s.updateNodeInfo);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState('default');

  useEffect(() => {
    if (selectedNode) {
      setName(selectedNode.name);
      setDescription(selectedNode.description ?? '');
      setNodeType(selectedNode.nodeType);
    }
  }, [selectedNode?.id]);

  const handleBlur = () => {
    if (!selectedNode || !projectId) return;
    const changed =
      name !== selectedNode.name ||
      description !== (selectedNode.description ?? '') ||
      nodeType !== selectedNode.nodeType;
    if (changed) {
      updateNodeInfo(projectId, selectedNode.id, { name, description, nodeType });
    }
  };

  if (!selectedNode) return null;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          className="mt-1 w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</label>
        <NodeTypePicker
          value={nodeType}
          onChange={(v) => setNodeType(v)}
          onBlur={handleBlur}
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Describe this node..."
          className="mt-1 w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {(selectedNode.childCount ?? 0) > 0 && (
        <div className="text-xs text-slate-400 bg-slate-50 rounded-md px-2.5 py-2">
          Contains <span className="font-medium text-slate-600">{selectedNode.childCount}</span> sub-node{selectedNode.childCount !== 1 ? 's' : ''} — double-click to drill in
        </div>
      )}
    </div>
  );
}
