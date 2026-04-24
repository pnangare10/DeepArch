import type { StateCreator } from 'zustand';
import type { StoreState } from './index';
import type { User, LoginDTO, RegisterDTO } from '@deeparch/shared';
import { authApi } from '../api/auth';
import { useThemeStore } from './themeSlice';
import type { Theme } from './themeSlice';

const TOKEN_KEY = 'deeparch_token';
const USER_KEY = 'deeparch_user';

function loadFromStorage(): { token: string | null; user: User | null } {
  try {
    // Check localStorage first (includes remembered sessions from old behavior)
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // Then check sessionStorage (session-only sessions)
      token = sessionStorage.getItem(TOKEN_KEY);
    }

    if (!token) return { token: null, user: null };

    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }

    const stored = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    const user: User | null = stored ? JSON.parse(stored) : null;
    return { token, user };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
}

export interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (data: LoginDTO, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => void;
  initAuth: () => void;
  forgotPassword: (email: string) => Promise<{ message: string; devToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set) => ({
  // Initialize synchronously from localStorage — prevents redirect flash on refresh
  ...loadFromStorage(),

  login: async (data, rememberMe = true) => {
    const response = await authApi.login(data);
    if (!response?.user || !response?.token) {
      throw new Error('Invalid response from server');
    }

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(USER_KEY, JSON.stringify(response.user));

    set({ user: response.user, token: response.token });
    if (response.user.themePreference) {
      useThemeStore.getState().setTheme(response.user.themePreference as Theme);
    }
  },

  register: async (data) => {
    const response = await authApi.register(data);
    if (!response?.user || !response?.token) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    set({ user: response.user, token: response.token });
    if (response.user.themePreference) {
      useThemeStore.getState().setTheme(response.user.themePreference as Theme);
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },

  initAuth: () => {},

  forgotPassword: async (email) => {
    const response = await authApi.forgotPassword(email);
    return response;
  },

  resetPassword: async (token, newPassword) => {
    const response = await authApi.resetPassword(token, newPassword);
    if (!response?.user || !response?.token) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    set({ user: response.user, token: response.token });
  },
});
