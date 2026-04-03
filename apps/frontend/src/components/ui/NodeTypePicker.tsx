import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NODE_TYPE_GROUPS } from '@deeparch/shared';

interface NodeTypePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

function formatLabel(type: string) {
  return type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function NodeTypePicker({ value, onChange, onBlur, className = '' }: NodeTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Pre-expand the group that contains the current value
    const initial: Record<string, boolean> = {};
    for (const [group, types] of Object.entries(NODE_TYPE_GROUPS)) {
      if (types.includes(value)) initial[group] = true;
    }
    return initial;
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onBlur]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const selectType = (type: string) => {
    onChange(type);
    setOpen(false);
    onBlur?.();
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 hover:border-slate-300 transition-colors"
      >
        <span>{formatLabel(value)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {Object.entries(NODE_TYPE_GROUPS).map(([group, types]) => (
            <div key={group}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
              >
                <span>{group}</span>
                {expandedGroups[group]
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
              </button>

              {/* Type options */}
              {expandedGroups[group] && (
                <div className="pb-1">
                  {types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectType(type)}
                      className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                        value === type
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {formatLabel(type)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
