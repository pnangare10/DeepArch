import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Upload, LogOut } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { ProjectCard } from '../components/project/ProjectCard';
import { ThemeToggle } from '../components/ThemeToggle';
import { useStore } from '../store';
import { useToast } from '../components/ui/Toast';
import type { Project } from '@deeparch/shared';

export function ProjectListPage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    projectsApi.getAll()
      .then((data) => {
        setProjects(data);
        setIsLoading(false);
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'Failed to load projects');
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
      toast(err instanceof Error ? err.message : 'Failed to create project');
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
      toast(err instanceof Error ? err.message : 'Failed to import project. Make sure the file is a valid DeepArch export.');
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
      toast(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-foreground">DeepArch</span>
          </div>
          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
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
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <span className="text-sm text-muted-foreground">{user.name}</span>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Projects</h1>

        {/* New project form */}
        {showNew && (
          <div className="mb-6 bg-background border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-foreground mb-3">New Project</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground placeholder:text-muted-foreground"
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
          <div className="text-muted-foreground text-sm">Loading projects...</div>
        )}

        {!isLoading && projects.length === 0 && !showNew && (
          <div className="text-center py-16 text-muted-foreground">
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
