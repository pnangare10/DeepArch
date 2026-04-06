import { Trash2, Layers, Clock } from 'lucide-react';
import type { Project } from '@deeparch/shared';
import { ROLE_LABELS, type ProjectRole } from '@deeparch/shared';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      onDelete(project.id);
    }
  };

  const updatedAt = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
            {project.role && (
              <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                {ROLE_LABELS[project.role as ProjectRole] ?? project.role}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        {!project.role && (
          <button
            onClick={handleDelete}
            className="ml-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {project.nodeCount ?? 0} node{project.nodeCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {updatedAt}
        </span>
      </div>
    </div>
  );
}
