import { useThemeStore } from '@/store/themeSlice';
import { Sun, Moon, Monitor } from 'lucide-react';

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const Icon = themeIcons[theme];

  const nextTheme = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  }[theme] as 'light' | 'dark' | 'system';

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
      title={`Switch to ${nextTheme} theme`}
      aria-label="Toggle theme"
    >
      <Icon size={18} className="text-foreground" />
    </button>
  );
}