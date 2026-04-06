import { ASSIGNABLE_ROLES, ROLE_LABELS, type ProjectRole } from '@deeparch/shared';

interface RoleChipPickerProps {
  label: string;
  selected: string[];
  onChange: (roles: string[]) => void;
  disabled?: boolean;
}

export function RoleChipPicker({ label, selected, onChange, disabled }: RoleChipPickerProps) {
  const toggle = (role: ProjectRole) => {
    if (disabled) return;
    if (selected.includes(role)) {
      onChange(selected.filter((r) => r !== role));
    } else {
      onChange([...selected, role]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {ASSIGNABLE_ROLES.map((role) => {
          const active = selected.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                active
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {ROLE_LABELS[role]}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => !disabled && onChange([])}
          className="self-start text-xs text-slate-500 hover:text-slate-300 mt-0.5"
        >
          Clear
        </button>
      )}
    </div>
  );
}
