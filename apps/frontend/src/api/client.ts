const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'You do not have permission to do that',
  404: 'Not found',
  409: 'Conflict',
  422: 'Invalid data',
  429: 'Too many requests — slow down',
  500: 'Server error',
  502: 'Server unavailable',
  503: 'Server unavailable',
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('deeparch_token');

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Cannot connect to server. Make sure the backend is running.');
  }

  if (!res.ok) {
    // Try to get the server's own error message first
    const body = await res.json().catch(() => ({}));
    const message = body.error || HTTP_MESSAGES[res.status] || `Server error (${res.status})`;

    if (res.status === 401) {
      localStorage.removeItem('deeparch_token');
      localStorage.removeItem('deeparch_user');
      // Throw before redirecting so callers (login/register) can show the error
      // instead of silently navigating away
      throw new ApiError(401, message);
    }

    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Separate helper used by client.ts internals to redirect on session expiry
// (called outside of auth routes, where a 401 means the token expired)
export function handleSessionExpired() {
  localStorage.removeItem('deeparch_token');
  localStorage.removeItem('deeparch_user');
  window.location.href = '/login';
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
