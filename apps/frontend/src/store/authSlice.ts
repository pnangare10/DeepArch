import type { StateCreator } from 'zustand';
import type { StoreState } from './index';
import type { User, LoginDTO, RegisterDTO } from '@deeparch/shared';
import { authApi } from '../api/auth';

const TOKEN_KEY = 'deeparch_token';
const USER_KEY = 'deeparch_user';

function loadFromStorage(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { token: null, user: null };
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }
    const stored = localStorage.getItem(USER_KEY);
    const user: User | null = stored ? JSON.parse(stored) : null;
    return { token, user };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
}

export interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => void;
  initAuth: () => void;
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set) => ({
  // Initialize synchronously from localStorage — prevents redirect flash on refresh
  ...loadFromStorage(),

  login: async (data) => {
    const response = await authApi.login(data);
    if (!response?.user || !response?.token) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    set({ user: response.user, token: response.token });
  },

  register: async (data) => {
    const response = await authApi.register(data);
    if (!response?.user || !response?.token) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    set({ user: response.user, token: response.token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },

  // Keep initAuth for the App.tsx effect — it's now a no-op since state is
  // already hydrated, but keeps the API stable in case we add token refresh later.
  initAuth: () => {},
});
