import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, Save, Check, Loader2, AlertCircle, Download } from 'lucide-react';
import { BreadcrumbNav } from '../navigation/BreadcrumbNav';
import { SearchBar } from '../navigation/SearchBar';
import { useStore } from '../../store';
import { projectsApi } from '../../api/projects';

interface TopBarProps {
  projectId: string;
  projectName: string;
  onSave: () => void;
}

export function TopBar({ projectId, projectName, onSave }: TopBarProps) {
  const navigate = useNavigate();
  const saveStatus = useStore((s) => s.saveStatus);

  const handleExport = () => {
    projectsApi.exportProject(projectId, projectName).catch(console.error);
  };

  const SaveIcon = saveStatus === 'saving'
    ? Loader2
    : saveStatus === 'saved'
    ? Check
    : saveStatus === 'error'
    ? AlertCircle
    : Save;

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'saved' ? 'Saved' :
    saveStatus === 'error' ? 'Error' :
    'Save';

  const saveBtnClass =
    saveStatus === 'saved'
      ? 'text-green-600'
      : saveStatus === 'error'
      ? 'text-red-500'
      : 'text-slate-500 hover:text-slate-800';

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center px-3 gap-3 flex-shrink-0">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        title="Back to projects"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Layers className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-slate-800 hidden sm:block">{projectName}</span>
      </div>

      <div className="w-px h-4 bg-slate-200 flex-shrink-0" />

      {/* Breadcrumbs — takes remaining space */}
      <div className="flex-1 min-w-0">
        <BreadcrumbNav />
      </div>

      {/* Search */}
      <div className="flex-shrink-0">
        <SearchBar projectId={projectId} />
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        title="Export project as JSON"
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        title={saveLabel}
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors flex-shrink-0 ${saveBtnClass} disabled:opacity-60`}
      >
        <SaveIcon className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{saveLabel}</span>
      </button>
    </header>
  );
}
