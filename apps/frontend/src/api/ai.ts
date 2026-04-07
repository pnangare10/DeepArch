import type { AISSEEvent } from '@deeparch/shared';

export function generateArchitecture(
  projectId: string,
  prompt: string,
  parentId: string | null,
  onEvent: (event: AISSEEvent) => void,
): () => void {
  const controller = new AbortController();
  const token = localStorage.getItem('deeparch_token');

  fetch(`/api/projects/${projectId}/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, parentId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        onEvent({ type: 'error', message: body.error ?? `Request failed (${res.status})` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(chunk.slice(6)) as AISSEEvent);
            } catch {
              // ignore malformed chunk
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err?.name !== 'AbortError') {
        onEvent({ type: 'error', message: 'Connection error. Check backend is running.' });
      }
    });

  return () => controller.abort();
}
