import { api } from './client';
import type { AuthResponse, LoginDTO, RegisterDTO } from '@deeparch/shared';

export const authApi = {
  login: (data: LoginDTO) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterDTO) => api.post<AuthResponse>('/auth/register', data),
  forgotPassword: (email: string) =>
    api.post<{ message: string; devToken?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<AuthResponse>('/auth/reset-password', { token, newPassword }),
  updatePreferences: (data: { themePreference: string }) =>
    api.patch<{ themePreference: string }>('/users/preferences', data),
};
