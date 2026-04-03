import { ChevronRight, Home } from 'lucide-react';
import { useStore } from '../../store';

export function BreadcrumbNav() {
  const breadcrumbs = useStore((s) => s.breadcrumbs);
  const navigateToLevel = useStore((s) => s.navigateToLevel);

  // Show at most: first item + ... + last 3 items when depth > 4
  const getDisplayed = () => {
    if (breadcrumbs.length <= 4) return breadcrumbs.map((b, i) => ({ ...b, index: i }));
    return [
      { ...breadcrumbs[0], index: 0 },
      { id: '__ellipsis__', name: '...', index: -1 },
      ...breadcrumbs.slice(-2).map((b, i) => ({ ...b, index: breadcrumbs.length - 2 + i })),
    ];
  };

  const displayed = getDisplayed();

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 flex-1">
      {displayed.map((item, pos) => (
        <span key={`${item.id}-${pos}`} className="flex items-center gap-1 min-w-0">
          {pos > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
          {item.index === -1 ? (
            <span className="text-slate-400 px-1">…</span>
          ) : item.index === breadcrumbs.length - 1 ? (
            // Current level — not clickable
            <span className="text-slate-800 font-medium truncate max-w-[140px] flex items-center gap-1">
              {item.index === 0 && <Home className="w-3.5 h-3.5" />}
              {item.index === 0 ? 'Root' : item.name}
            </span>
          ) : (
            // Ancestor — clickable
            <button
              onClick={() => navigateToLevel(item.index)}
              className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[120px] flex items-center gap-1 transition-colors"
              title={item.name}
            >
              {item.index === 0 && <Home className="w-3.5 h-3.5" />}
              {item.index === 0 ? 'Root' : item.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
