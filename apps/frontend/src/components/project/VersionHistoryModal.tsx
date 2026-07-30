import { useEffect, useState } from 'react';
import { X, History, Camera, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { versionsApi } from '../../api/versions';
import { useToast } from '../ui/Toast';
import { ROLE_HIERARCHY, type ProjectRole, type ProjectVersion } from '@deeparch/shared';
import { useStore } from '../../store';

interface VersionHistoryModalProps {
  projectId: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VersionHistoryModal({ projectId, onClose }: VersionHistoryModalProps) {
  const toast = useToast();
  const projectRole = useStore((s) => s.projectRole);
  const resetNavigation = useStore((s) => s.resetNavigation);
  const loadLevel = useStore((s) => s.loadLevel);

  // null role = project owner (full access)
  const rank = projectRole === null ? ROLE_HIERARCHY.owner : ROLE_HIERARCHY[projectRole as ProjectRole] ?? 0;
  const canSnapshot = rank >= ROLE_HIERARCHY.developer;
  const canRestore = rank >= ROLE_HIERARCHY['dev-architect'];

  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    versionsApi
      .list(projectId)
      .then(setVersions)
      .catch(() => toast('Failed to load version history', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSnapshot = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const version = await versionsApi.create(projectId, name.trim());
      setVersions((prev) => [version, ...prev]);
      setName('');
      toast(`Version "${version.name}" saved`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save version', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version: ProjectVersion) => {
    setRestoringId(version.id);
    try {
      const { backup } = await versionsApi.restore(projectId, version.id);
      setVersions((prev) => [backup, ...prev]);
      // The whole tree changed — go back to root and reload
      resetNavigation();
      await loadLevel(projectId, null);
      toast(`Restored "${version.name}" — current state backed up as "${backup.name}"`, 'success');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to restore version', 'error');
    } finally {
      setRestoringId(null);
      setConfirmingId(null);
    }
  };

  const handleDelete = async (version: ProjectVersion) => {
    try {
      await versionsApi.delete(projectId, version.id);
      setVersions((prev) => prev.filter((v) => v.id !== version.id));
      toast(`Version "${version.name}" deleted`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete version', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Version History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Save snapshot row */}
          {canSnapshot && (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSnapshot()}
                placeholder='Version name, e.g. "Q3 review baseline"'
                maxLength={100}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSnapshot}
                disabled={!name.trim() || saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                title="Save a snapshot of the current architecture"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <span className="hidden sm:inline">Save version</span>
              </button>
            </div>
          )}

          {/* Version list */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {loading && (
              <p className="text-sm text-slate-400 py-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading versions…
              </p>
            )}
            {!loading && versions.length === 0 && (
              <p className="text-sm text-slate-400 italic py-2">
                No versions yet. Save one to capture the current state of the whole architecture.
              </p>
            )}
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(v.createdAt)} · {v.createdBy.name} · {v.nodeCount} nodes, {v.edgeCount} edges
                  </p>
                </div>
                {canRestore && confirmingId === v.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoringId !== null}
                      className="text-xs font-medium px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      {restoringId === v.id ? 'Restoring…' : 'Confirm restore'}
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      disabled={restoringId !== null}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canRestore && (
                      <button
                        onClick={() => setConfirmingId(v.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Restore this version (replaces the current architecture)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canRestore && (
                      <button
                        onClick={() => handleDelete(v)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete this version"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-400">
            Restoring replaces the entire architecture with the selected version. A backup of the
            current state is saved automatically first.
          </p>
        </div>
      </div>
    </div>
  );
}
