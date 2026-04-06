import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Pencil, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../../store';
import { commentsApi } from '../../api/comments';
import { useToast } from '../ui/Toast';
import type { Comment } from '@deeparch/shared';

interface CommentSectionProps {
  projectId: string;
  nodeId: string;
}

export function CommentSection({ projectId, nodeId }: CommentSectionProps) {
  const toast = useToast();
  const currentUserId = useStore((s) => s.user?.id);
  const projectRole = useStore((s) => s.projectRole);

  const incomingComment = useStore((s) => s.incomingComment);
  const incomingCommentUpdate = useStore((s) => s.incomingCommentUpdate);
  const incomingCommentDelete = useStore((s) => s.incomingCommentDelete);
  const clearCommentEvents = useStore((s) => s.clearCommentEvents);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load comments on mount / node change
  useEffect(() => {
    commentsApi.list(projectId, nodeId)
      .then(setComments)
      .catch(() => {});
  }, [projectId, nodeId]);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  // Handle incoming WS events
  useEffect(() => {
    if (incomingComment && incomingComment.nodeId === nodeId) {
      setComments((prev) => {
        if (prev.some((c) => c.id === incomingComment.id)) return prev;
        return [...prev, incomingComment];
      });
      clearCommentEvents();
    }
  }, [incomingComment, nodeId, clearCommentEvents]);

  useEffect(() => {
    if (incomingCommentUpdate) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === incomingCommentUpdate.commentId
            ? { ...c, text: incomingCommentUpdate.text, updatedAt: incomingCommentUpdate.updatedAt }
            : c,
        ),
      );
      clearCommentEvents();
    }
  }, [incomingCommentUpdate, clearCommentEvents]);

  useEffect(() => {
    if (incomingCommentDelete) {
      setComments((prev) => prev.filter((c) => c.id !== incomingCommentDelete));
      clearCommentEvents();
    }
  }, [incomingCommentDelete, clearCommentEvents]);

  const handleSubmit = async () => {
    if (!newText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await commentsApi.create(projectId, nodeId, { text: newText.trim() });
      setComments((prev) => [...prev, comment]);
      setNewText('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await commentsApi.update(projectId, commentId, { text: editText.trim() });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to edit comment', 'error');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentsApi.delete(projectId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete comment', 'error');
    }
  };

  const isOwner = projectRole === null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Comments {comments.length > 0 && `(${comments.length})`}
        </p>
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-slate-400 italic">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="group flex flex-col gap-0.5 bg-slate-50 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-slate-700">{c.user.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.userId === currentUserId && editingId !== c.id && (
                  <button
                    onClick={() => { setEditingId(c.id); setEditText(c.text); }}
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {(c.userId === currentUserId || isOwner) && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {editingId === c.id ? (
              <div className="flex gap-1 mt-1">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={() => handleEdit(c.id)} className="text-green-600 hover:text-green-700">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-600 whitespace-pre-wrap">{c.text}</p>
            )}

            <span className="text-[10px] text-slate-400">
              {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {c.updatedAt !== c.createdAt && ' (edited)'}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* New comment input */}
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Add a comment…"
          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!newText.trim() || submitting}
          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
