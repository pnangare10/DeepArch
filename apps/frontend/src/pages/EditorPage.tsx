import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { projectsApi } from '../api/projects';
import { useStore } from '../store';
import { TopBar } from '../components/layout/TopBar';
import { Canvas } from '../components/canvas/Canvas';
import { DetailPanel } from '../components/layout/DetailPanel';
import { useAutoSave } from '../hooks/useAutoSave';
import type { Project } from '@deeparch/shared';

function EditorInner({ project }: { project: Project }) {
  const setProjectId = useStore((s) => s.setProjectId);
  const loadLevel = useStore((s) => s.loadLevel);
  const resetNavigation = useStore((s) => s.resetNavigation);

  useEffect(() => {
    setProjectId(project.id);
    resetNavigation();
    loadLevel(project.id, null);
    return () => {
      // Reset on unmount
      setProjectId('');
    };
  }, [project.id]);

  const { triggerSave } = useAutoSave(project.id);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar projectId={project.id} projectName={project.name} onSave={triggerSave} />
      <div className="flex flex-1 overflow-hidden">
        <Canvas projectId={project.id} />
        <DetailPanel />
      </div>
    </div>
  );
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    projectsApi
      .getById(projectId)
      .then(setProject)
      .catch(() => setError(true));
  }, [projectId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Project not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline text-sm"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <EditorInner project={project} />
    </ReactFlowProvider>
  );
}
