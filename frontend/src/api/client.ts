/**
 * Typed API client for all Lenny Growth Assistant backend contracts.
 * Never exposes credentials; all auth is server-side via .env.
 * All endpoints map 1:1 to the implemented FastAPI routers.
 */

import type { Citation, Message, Session, ModelsStatusResponse } from '../types/chat';

const API_BASE = '/api';

// ─── Session shapes ────────────────────────────────────────────────────────

export interface SessionListResponse {
  items: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionDetailResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  artifacts: unknown[];
}

export interface CreateSessionPayload {
  title?: string;
}

export interface RenameSessionPayload {
  title: string;
}

// ─── Chat SSE shapes ───────────────────────────────────────────────────────

export type SSEEventType = 'status' | 'citations' | 'token' | 'done' | 'error';

export interface SSEStatusData {
  stage: string;
  message?: string;
}

export interface SSECitationsData {
  citations: Citation[];
}

export interface SSETokenData {
  token: string;
}

export interface SSEDoneData {
  final_content: string;
  citations?: Citation[];
}

export interface SSEErrorData {
  error: string;
}

// ─── API error ─────────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public detail?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? String(body);
    } catch {
      // ignore
    }
    throw new APIError(
      detail ?? `Request failed with status ${res.status}`,
      res.status,
      detail,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export const sessionsApi = {
  list: (limit = 50, offset = 0) =>
    apiRequest<SessionListResponse>(`/sessions?limit=${limit}&offset=${offset}`),

  get: (sessionId: string) =>
    apiRequest<SessionDetailResponse>(`/sessions/${sessionId}`),

  create: (payload: CreateSessionPayload = {}) =>
    apiRequest<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: payload.title ?? 'New Growth Session' }),
    }),

  rename: (sessionId: string, payload: RenameSessionPayload) =>
    apiRequest<Session>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (sessionId: string) =>
    apiRequest<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),

  listMessages: (sessionId: string, limit = 100) =>
    apiRequest<{ items: Message[]; total: number }>(
      `/sessions/${sessionId}/messages?limit=${limit}`,
    ),
};

// ─── Models / Provider ────────────────────────────────────────────────────

export const modelsApi = {
  status: () => apiRequest<ModelsStatusResponse>('/models'),

  switch: (provider: 'local_ollama' | 'cloud_openai') =>
    apiRequest<{ active_provider: string }>('/models/switch', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),
};

// ─── Health ───────────────────────────────────────────────────────────────

export interface ReadinessResponse {
  status: 'ready' | 'degraded' | 'unhealthy';
  active_provider: string;
  dependencies: {
    database: { healthy: boolean; status?: string };
    ollama: {
      healthy: boolean;
      status?: string;
      required_models_present?: Record<string, boolean>;
      error?: string;
    };
    cloud_provider: { is_ready: boolean; message?: string };
  };
}

export const healthApi = {
  ready: () => apiRequest<ReadinessResponse>('/ready'),
};

// ─── Chat SSE stream ──────────────────────────────────────────────────────

export interface ChatStreamCallbacks {
  onStatus: (data: SSEStatusData) => void;
  onCitations: (data: SSECitationsData) => void;
  onToken: (data: SSETokenData) => void;
  onDone: (data: SSEDoneData) => void;
  onError: (err: Error) => void;
}

/**
 * Opens an SSE stream to POST /api/chat/stream.
 * Returns an AbortController so callers can cancel mid-stream.
 * No credentials or API keys are passed here — handled server-side.
 */
export function streamChat(
  sessionId: string,
  prompt: string,
  callbacks: ChatStreamCallbacks,
  providerOverride?: string,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          prompt,
          provider_override: providerOverride ?? null,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = `Server returned ${res.status}`;
        try {
          const body = await res.json();
          detail = body?.detail ?? detail;
        } catch {
          // ignore
        }
        throw new APIError(detail, res.status);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Unable to read SSE stream');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const block of events) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'status') callbacks.onStatus(data);
            else if (eventType === 'citations') callbacks.onCitations(data);
            else if (eventType === 'token') callbacks.onToken(data);
            else if (eventType === 'done') callbacks.onDone(data);
            else if (eventType === 'error') throw new Error(data.error ?? 'Server error');
          } catch (parseErr) {
            if ((parseErr as Error).name !== 'SyntaxError') throw parseErr;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return controller;
}
