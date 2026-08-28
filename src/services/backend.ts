import type { ChatMessage, Note, NoteStats } from '../types';

export type BackendPhase = 'disabled' | 'checking' | 'online' | 'offline';

export interface BackendStatus {
  phase: BackendPhase;
  baseUrl: string | null;
  latencyMs?: number;
  noteCount?: number;
  aiReady?: boolean;
  message: string;
  checkedAt?: number;
}

interface HealthResponse {
  ok: boolean;
  service: string;
  storage: { driver: string; notes: number };
  ai: { ready: boolean; latencyMs: number; endpoint: string };
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string; details?: unknown };
}

class BackendUnavailableError extends Error {
  readonly unavailable = true;

  constructor(message: string) {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

class BackendResponseError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error?.message || `后端返回错误 (${status})`);
    this.name = 'BackendResponseError';
    this.status = status;
    this.code = payload.error?.code;
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function getBackendBaseUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (configured?.trim()) return normalizeBaseUrl(configured);

  if (typeof location !== 'undefined') {
    const host = location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
      return 'http://127.0.0.1:8787/api';
    }
  }
  return null;
}

let status: BackendStatus = {
  phase: getBackendBaseUrl() ? 'checking' : 'disabled',
  baseUrl: getBackendBaseUrl(),
  message: getBackendBaseUrl() ? '正在连接本机后端' : '未配置后端，使用离线缓存',
};
const listeners = new Set<(next: BackendStatus) => void>();

function publish(next: Partial<BackendStatus>) {
  status = { ...status, ...next, baseUrl: getBackendBaseUrl() };
  listeners.forEach((listener) => listener(status));
}

export function getBackendStatus(): BackendStatus {
  return status;
}

export function subscribeBackendStatus(listener: (next: BackendStatus) => void) {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function isBackendUnavailable(error: unknown): boolean {
  return error instanceof BackendUnavailableError;
}

async function request<T>(
  pathname: string,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<T> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    publish({ phase: 'disabled', message: '未配置后端，使用离线缓存' });
    throw new BackendUnavailableError('当前页面没有配置 EdgeMind 后端');
  }

  if (status.phase !== 'online') {
    publish({ phase: 'checking', message: '正在连接本机后端' });
  }
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? '后端连接超时，已切换离线缓存'
        : '后端不可达，已切换离线缓存';
    publish({ phase: 'offline', latencyMs: Date.now() - startedAt, message, checkedAt: Date.now() });
    throw new BackendUnavailableError(message);
  } finally {
    clearTimeout(timer);
  }

  let payload: T & ApiErrorPayload;
  try {
    payload = (await response.json()) as T & ApiErrorPayload;
  } catch {
    publish({ phase: 'offline', message: '后端响应格式无效，已切换离线缓存', checkedAt: Date.now() });
    throw new BackendUnavailableError('后端没有返回有效 JSON');
  }

  publish({
    phase: 'online',
    latencyMs: Date.now() - startedAt,
    message: '本机后端已连接',
    checkedAt: Date.now(),
  });
  if (!response.ok) throw new BackendResponseError(response.status, payload);
  return payload;
}

export const BackendApi = {
  isConfigured(): boolean {
    return Boolean(getBackendBaseUrl());
  },

  async health(): Promise<HealthResponse> {
    const health = await request<HealthResponse>('/health', {}, 2500);
    publish({
      phase: 'online',
      noteCount: health.storage.notes,
      aiReady: health.ai.ready,
      message: health.ai.ready ? '后端与本机模型均已连接' : '后端已连接，模型服务未启动',
      checkedAt: Date.now(),
    });
    return health;
  },

  async listNotes(query = ''): Promise<Note[]> {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    return (await request<{ notes: Note[] }>(`/notes${suffix}`)).notes;
  },

  async getNote(id: string): Promise<Note | null> {
    try {
      return (await request<{ note: Note }>(`/notes/${encodeURIComponent(id)}`)).note;
    } catch (error) {
      if (error instanceof BackendResponseError && error.status === 404) return null;
      throw error;
    }
  },

  async createNote(note: Partial<Note>): Promise<Note> {
    return (
      await request<{ note: Note }>('/notes', {
        method: 'POST',
        body: JSON.stringify(note),
      })
    ).note;
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    try {
      return (
        await request<{ note: Note }>(`/notes/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      ).note;
    } catch (error) {
      if (error instanceof BackendResponseError && error.status === 404) return null;
      throw error;
    }
  },

  async deleteNote(id: string): Promise<boolean> {
    try {
      return (
        await request<{ deleted: boolean }>(`/notes/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
      ).deleted;
    } catch (error) {
      if (error instanceof BackendResponseError && error.status === 404) return false;
      throw error;
    }
  },

  async syncNotes(notes: Note[]): Promise<Note[]> {
    return (
      await request<{ notes: Note[] }>('/notes/sync', {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }, 12000)
    ).notes;
  },

  async stats(): Promise<NoteStats> {
    return (await request<{ stats: NoteStats }>('/stats')).stats;
  },

  async chat(messages: ChatMessage[]): Promise<{
    content: string;
    inferenceMs: number;
    tokensPerSecond?: number;
  }> {
    return request(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          messages: messages
            .filter((message) => message.role !== 'system')
            .slice(-12)
            .map(({ role, content }) => ({ role, content })),
          maxTokens: 512,
        }),
      },
      125000
    );
  },

  async summarize(content: string): Promise<string> {
    return (
      await request<{ summary: string }>(
        '/ai/summarize',
        { method: 'POST', body: JSON.stringify({ content }) },
        125000
      )
    ).summary;
  },

  async tags(content: string): Promise<string[]> {
    return (
      await request<{ tags: string[] }>(
        '/ai/tags',
        { method: 'POST', body: JSON.stringify({ content }) },
        125000
      )
    ).tags;
  },
};
