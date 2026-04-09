import { api } from './client';
import type { AuthResponse, LoginDTO, RegisterDTO } from '@deeparch/shared';

export const authApi = {
  login: (data: LoginDTO) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterDTO) => api.post<AuthResponse>('/auth/register', data),
  updatePreferences: (data: { themePreference: string }) =>
    api.patch<{ themePreference: string }>('/users/preferences', data),
};
