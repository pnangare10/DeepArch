import { useEffect, useState } from 'react';
import { X, UserPlus, Trash2, Crown } from 'lucide-react';
import { membersApi } from '../../api/members';
import { useToast } from '../ui/Toast';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type ProjectMember, type ProjectRole } from '@deeparch/shared';
import { useStore } from '../../store';

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

export function ShareModal({ projectId, onClose }: ShareModalProps) {
  const toast = useToast();
  const projectRole = useStore((s) => s.projectRole);
  const isOwner = projectRole === null;

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<ProjectRole, 'owner'>>('developer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    membersApi.list(projectId).then(setMembers).catch(() => {});
  }, [projectId]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const member = await membersApi.invite(projectId, { email: email.trim(), role });
      setMembers((prev) => [...prev, member]);
      setEmail('');
      toast(`${member.user.name} invited as ${ROLE_LABELS[role]}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to invite member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: Exclude<ProjectRole, 'owner'>) => {
    try {
      const updated = await membersApi.changeRole(projectId, userId, { role: newRole });
      setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change role', 'error');
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    try {
      await membersApi.remove(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast(`${name} removed`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Share Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Invite row (owner only) */}
          {isOwner && (
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                placeholder="Email address"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<ProjectRole, 'owner'>)}
                className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <button
                onClick={handleInvite}
                disabled={!email.trim() || loading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                title="Invite"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Member list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-sm text-slate-400 italic py-2">No members yet. Invite someone above.</p>
            )}
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.user.email}</p>
                </div>
                {isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.userId, e.target.value as Exclude<ProjectRole, 'owner'>)}
                    className="text-xs px-1.5 py-1 border border-slate-200 rounded focus:outline-none"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                    {ROLE_LABELS[m.role as ProjectRole] ?? m.role}
                  </span>
                )}
                {isOwner && (
                  <button
                    onClick={() => handleRemove(m.userId, m.user.name)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role legend */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Crown className="w-3 h-3" />
            <span>Owner always has full access. Use "Allow only" in node metadata to restrict drill-in by role.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
