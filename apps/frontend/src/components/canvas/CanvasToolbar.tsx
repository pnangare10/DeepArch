import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useStore } from '../../store';
import { NodeTypePicker } from '../ui/NodeTypePicker';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('default');
  const projectId = useStore((s) => s.projectId);
  const currentParentId = useStore((s) => s.currentParentId);
  const addNode = useStore((s) => s.addNode);
  const nodes = useStore((s) => s.nodes);

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
      <div className="flex gap-1 bg-white rounded-lg shadow-md border border-slate-200 p-1">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          title="Add node"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-px bg-slate-200" />
        <button
          onClick={() => zoomIn()}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          title="Fit view"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {showAddMenu && (
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-3 w-56">
          <input
            type="text"
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            placeholder="Node name..."
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
