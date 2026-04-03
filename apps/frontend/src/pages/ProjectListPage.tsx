import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Upload } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { ProjectCard } from '../components/project/ProjectCard';
import type { Project } from '@deeparch/shared';

export function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    projectsApi.getAll().then((data) => {
      setProjects(data);
      setIsLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const project = await projectsApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      navigate(`/project/${project.id}`);
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const project = await projectsApi.importProject(data);
      navigate(`/project/${project.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to import project. Make sure the file is a valid DeepArch export.');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-800">DeepArch</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Projects</h1>

        {/* New project form */}
        {showNew && (
          <div className="mb-6 bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-3">New Project</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-slate-400 text-sm">Loading projects...</div>
        )}

        {!isLoading && projects.length === 0 && !showNew && (
          <div className="text-center py-16 text-slate-400">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">No projects yet</p>
            <p className="text-sm">Create your first architecture diagram</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={(id) => navigate(`/project/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
