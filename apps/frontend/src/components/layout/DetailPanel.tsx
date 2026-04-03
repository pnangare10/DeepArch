import { X } from 'lucide-react';
import { useStore } from '../../store';
import { NodeInfoSection } from '../metadata/NodeInfoSection';
import { MetadataEditor } from '../metadata/MetadataEditor';
import { LinksSection } from '../metadata/LinksSection';

export function DetailPanel() {
  const isDetailOpen = useStore((s) => s.isDetailOpen);
  const selectedNode = useStore((s) => s.selectedNode);
  const closeDetail = useStore((s) => s.closeDetail);

  if (!isDetailOpen || !selectedNode) return null;

  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">Node Details</h3>
        <button
          onClick={closeDetail}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <NodeInfoSection />
        <div className="border-t border-slate-100" />
        <MetadataEditor />
        <div className="border-t border-slate-100" />
        <LinksSection />
      </div>
    </div>
  );
}
