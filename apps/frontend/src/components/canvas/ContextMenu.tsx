import { useEffect, useRef, useState } from 'react';
import { Trash2, PlusSquare, Tag, Copy, Clipboard, FolderInput, Scissors } from 'lucide-react';
import type { ContextMenuTarget } from '../../store/metadataSlice';
import { useStore } from '../../store';
import { MoveNodeModal } from './MoveNodeModal';

interface ContextMenuProps {
  menu: ContextMenuTarget;
  projectId: string;
  onClose: () => void;
}

export function ContextMenu({ menu, projectId, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(
    menu.type === 'edge' ? (menu.label ?? '') : '',
  );
  const [nodeModal, setNodeModal] = useState<'move' | 'copy' | null>(null);

  const deleteNode = useStore((s) => s.deleteNode);
  const addNode = useStore((s) => s.addNode);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const updateEdgeLabel = useStore((s) => s.updateEdgeLabel);
  const navigateInto = useStore((s) => s.navigateInto);
  const currentParentId = useStore((s) => s.currentParentId);
  const copyNodeById = useStore((s) => s.copyNodeById);
  const cutNode = useStore((s) => s.cutNode);
  const pasteNodes = useStore((s) => s.pasteNodes);
  const clipboard = useStore((s) => s.clipboard);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleDeleteNode = async () => {
    if (menu.type !== 'node') return;
    await deleteNode(projectId, menu.id);
    onClose();
  };

  const handleDrillInto = () => {
    if (menu.type !== 'node') return;
    navigateInto(menu.id, menu.name);
    onClose();
  };

  const handleAddNodeAtPaneClick = async () => {
    if (menu.type !== 'pane') return;
    await addNode(projectId, {
      name: 'New Node',
      nodeType: 'default',
      positionX: Math.round(menu.canvasX),
      positionY: Math.round(menu.canvasY),
      parentId: currentParentId,
    });
    onClose();
  };

  const handlePasteHere = async () => {
    if (menu.type !== 'pane' || !clipboard || clipboard.length === 0) return;
    // Paste at click position relative to first clipboard node
    const firstNode = clipboard[0];
    const offsetX = Math.round(menu.canvasX) - firstNode.positionX;
    const offsetY = Math.round(menu.canvasY) - firstNode.positionY;
    await pasteNodes(projectId, offsetX, offsetY);
    onClose();
  };

  const handleDeleteEdge = async () => {
    if (menu.type !== 'edge') return;
    await deleteEdge(projectId, menu.id);
    onClose();
  };

  const handleSaveLabel = async () => {
    if (menu.type !== 'edge') return;
    await updateEdgeLabel(projectId, menu.id, labelValue);
    setEditingLabel(false);
    onClose();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: menu.y,
    left: menu.x,
    zIndex: 1000,
  };

  const itemClass =
    'flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer rounded transition-colors';
  const dangerClass =
    'flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer rounded transition-colors';

  if (nodeModal && menu.type === 'node') {
    return (
      <MoveNodeModal
        projectId={projectId}
        nodeId={menu.id}
        nodeName={menu.name}
        mode={nodeModal}
        onClose={() => { setNodeModal(null); onClose(); }}
      />
    );
  }

  return (
    <div
      ref={ref}
      style={menuStyle}
      className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[170px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.type === 'node' && (
        <>
          <div onClick={handleDrillInto} className={itemClass}>
            <PlusSquare className="w-3.5 h-3.5 text-slate-400" />
            Open / drill in
          </div>
          <div className="h-px bg-slate-100 my-1" />
          <div onClick={() => { cutNode(projectId, menu.id); onClose(); }} className={itemClass}>
            <Scissors className="w-3.5 h-3.5 text-slate-400" />
            Cut
          </div>
          <div onClick={() => { copyNodeById(menu.id); onClose(); }} className={itemClass}>
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            Copy
          </div>
          <div className="h-px bg-slate-100 my-1" />
          <div onClick={() => setNodeModal('move')} className={itemClass}>
            <FolderInput className="w-3.5 h-3.5 text-slate-400" />
            Move to…
          </div>
          <div onClick={() => setNodeModal('copy')} className={itemClass}>
            <Copy className="w-3.5 h-3.5 text-emerald-500" />
            Copy to…
          </div>
          <div className="h-px bg-slate-100 my-1" />
          <div onClick={handleDeleteNode} className={dangerClass}>
            <Trash2 className="w-3.5 h-3.5" />
            Delete node
          </div>
        </>
      )}

      {menu.type === 'edge' && (
        <>
          {editingLabel ? (
            <div className="px-3 py-2 space-y-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Edge label</div>
              <input
                autoFocus
                type="text"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') { setEditingLabel(false); onClose(); } }}
                placeholder="e.g. HTTPS, SQL…"
                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveLabel} className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                <button onClick={() => { setEditingLabel(false); onClose(); }} className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div onClick={() => setEditingLabel(true)} className={itemClass}>
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {menu.label ? 'Edit label' : 'Add label'}
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <div onClick={handleDeleteEdge} className={dangerClass}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete edge
              </div>
            </>
          )}
        </>
      )}

      {menu.type === 'pane' && (
        <>
          <div onClick={handleAddNodeAtPaneClick} className={itemClass}>
            <PlusSquare className="w-3.5 h-3.5 text-slate-400" />
            Add node here
          </div>
          {clipboard && clipboard.length > 0 && (
            <div onClick={handlePasteHere} className={itemClass}>
              <Clipboard className="w-3.5 h-3.5 text-slate-400" />
              Paste here
            </div>
          )}
        </>
      )}
    </div>
  );
}
