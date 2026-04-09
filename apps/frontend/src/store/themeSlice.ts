import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeSlice {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const createThemeSlice = (set: any, get: any): ThemeSlice => ({
  theme: 'system',
  resolvedTheme: getSystemTheme(),

  setTheme: (theme: Theme) => {
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    set({ theme, resolvedTheme });

    // Apply theme class to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    // Persist to backend if logged in
    if (localStorage.getItem('deeparch_token')) {
      authApi.updatePreferences({ themePreference: theme }).catch(() => {});
    }
  },

  toggleTheme: () => {
    const { theme } = get();
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    get().setTheme(newTheme);
  },
});

export const useThemeStore = create<ThemeSlice>()(
  persist(
    (set, get) => createThemeSlice(set, get),
    {
      name: 'deeparch-theme',
      skipHydration: true,
    }
  )
);