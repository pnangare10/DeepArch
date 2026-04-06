import { Shield } from 'lucide-react';
import { useStore } from '../../store';
import { RoleChipPicker } from '../ui/RoleChipPicker';

export function AccessControlSection() {
  const projectId = useStore((s) => s.projectId);
  const projectRole = useStore((s) => s.projectRole);
  const selectedNode = useStore((s) => s.selectedNode);
  const updateMetadata = useStore((s) => s.updateMetadata);

  // Only the owner (projectRole === null) can see/edit this
  if (!selectedNode || !projectId || projectRole !== null) return null;

  const meta = selectedNode.metadata ?? {};
  const accessInclude: string[] = (meta as unknown as Record<string, unknown>).accessInclude as string[] ?? [];
  const accessExclude: string[] = (meta as unknown as Record<string, unknown>).accessExclude as string[] ?? [];

  const handleIncludeChange = (roles: string[]) => {
    updateMetadata(projectId, selectedNode.id, {
      ...meta,
      accessInclude: roles,
      accessExclude: roles.length > 0 ? [] : accessExclude,
    });
  };

  const handleExcludeChange = (roles: string[]) => {
    updateMetadata(projectId, selectedNode.id, {
      ...meta,
      accessInclude: roles.length > 0 ? [] : accessInclude,
      accessExclude: roles,
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Drill-in Access</p>
      </div>

      <div className="space-y-3 text-slate-800">
        <RoleChipPicker
          label="Allow only"
          selected={accessInclude}
          onChange={handleIncludeChange}
          disabled={accessExclude.length > 0}
        />
        <RoleChipPicker
          label="Block"
          selected={accessExclude}
          onChange={handleExcludeChange}
          disabled={accessInclude.length > 0}
        />
        {(accessInclude.length === 0 && accessExclude.length === 0) && (
          <p className="text-xs text-slate-400 italic">No restrictions — all members can drill in.</p>
        )}
      </div>
    </div>
  );
}
