import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Plus, ZoomIn, ZoomOut, Maximize, Sparkles, StickyNote } from 'lucide-react';
import { useStore } from '../../store';
import { NodeTypePicker } from '../ui/NodeTypePicker';
import { AIGenerateModal } from './AIGenerateModal';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('default');
  const projectId = useStore((s) => s.projectId);
  const currentParentId = useStore((s) => s.currentParentId);
  const addNode = useStore((s) => s.addNode);
  const nodes = useStore((s) => s.nodes);

  const handleAddStickyNote = () => {
    if (!projectId) return;
    const offsetX = (nodes.length % 5) * 220;
    const offsetY = Math.floor(nodes.length / 5) * 180;
    addNode(projectId, {
      name: 'Note',
      nodeType: 'sticky-note',
      parentId: currentParentId,
      positionX: 100 + offsetX,
      positionY: 100 + offsetY,
      width: 200,
      height: 200,
      description: '',
      metadata: { customFields: [], links: [], tags: [], bgColor: '#fef08a' },
    });
  };

  const handleAddNode = () => {
    if (!projectId || !newNodeName.trim()) return;
    // Place new node with offset based on existing node count
    const offsetX = (nodes.length % 5) * 200;
    const offsetY = Math.floor(nodes.length / 5) * 150;
    addNode(projectId, {
      name: newNodeName.trim(),
      nodeType: newNodeType,
      parentId: currentParentId,
      positionX: 100 + offsetX,
      positionY: 100 + offsetY,
    });
    setNewNodeName('');
    setNewNodeType('default');
    setShowAddMenu(false);
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <div className="flex gap-1 bg-background rounded-lg shadow-md border border-border p-1">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
          title="Add node"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setShowAddMenu(false); setShowAIModal(true); }}
          className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-md transition-colors text-violet-600 dark:text-violet-400"
          title="Generate with AI"
        >
          <Sparkles className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setShowAddMenu(false); handleAddStickyNote(); }}
          className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-md transition-colors text-yellow-600 dark:text-yellow-400"
          title="Add sticky note"
        >
          <StickyNote className="w-4 h-4" />
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => zoomIn()}
          className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
          title="Fit view"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {showAIModal && projectId && (
        <AIGenerateModal projectId={projectId} onClose={() => setShowAIModal(false)} />
      )}

      {showAddMenu && (
        <div className="bg-background rounded-lg shadow-md border border-border p-3 w-56">
          <input
            type="text"
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            placeholder="Node name..."
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <NodeTypePicker
            value={newNodeType}
            onChange={setNewNodeType}
            className="mb-2"
          />
          <button
            onClick={handleAddNode}
            disabled={!newNodeName.trim()}
            className="w-full px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Node
          </button>
        </div>
      )}
    </div>
  );
}
