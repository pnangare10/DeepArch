import { useEffect } from 'react';
import { Layers, X } from 'lucide-react';
import { BreadcrumbNav } from '../navigation/BreadcrumbNav';
import { useStore } from '../../store';

interface PresentationBarProps {
  projectName: string;
}

// Slim overlay shown instead of the TopBar while presenting.
// Only navigation is available — all editing UI is hidden.
export function PresentationBar({ projectName }: PresentationBarProps) {
  const setPresentationMode = useStore((s) => s.setPresentationMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentationMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setPresentationMode]);

  return (
    <header className="h-11 bg-slate-900 text-white flex items-center px-4 gap-3 flex-shrink-0">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Layers className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold">{projectName}</span>
      </div>

      <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

      <div className="flex-1 min-w-0 presentation-breadcrumbs">
        <BreadcrumbNav />
      </div>

      <span className="text-xs text-slate-400 hidden md:block flex-shrink-0">
        Double-click a block to drill in · Backspace to go up
      </span>

      <button
        onClick={() => setPresentationMode(false)}
        title="Exit presentation mode (Esc)"
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        Exit
      </button>
    </header>
  );
}
