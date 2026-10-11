/**
 * @vitest-environment jsdom
 * Tests for the typed API client layer.
 * Uses vi.stubGlobal to mock fetch — no real HTTP calls.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sessionsApi, modelsApi, healthApi, streamChat, APIError } from '../api/client';

function makeFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
    body: null,
  });
}

function makeFetchError(status: number, detail: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ detail }),
  });
}

describe('API client — sessionsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('list() calls GET /api/sessions and returns items', async () => {
    const payload = { items: [{ id: 'abc', title: 'Test' }], total: 1, limit: 50, offset: 0 };
    vi.stubGlobal('fetch', makeFetchOk(payload));
    const result = await sessionsApi.list();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test');
  });

  it('create() calls POST /api/sessions', async () => {
    const session = { id: 'new-id', title: 'My Session', created_at: '', updated_at: '', message_count: 0 };
    const fetchMock = makeFetchOk(session, 201);
    vi.stubGlobal('fetch', fetchMock);
    const result = await sessionsApi.create({ title: 'My Session' });
    expect(result.title).toBe('My Session');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/sessions');
    expect(opts.method).toBe('POST');
  });

  it('delete() calls DELETE /api/sessions/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);
    await sessionsApi.delete('sess-123');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/sessions/sess-123');
    expect(opts.method).toBe('DELETE');
  });

  it('rename() calls PATCH /api/sessions/:id with title', async () => {
    const updated = { id: 'sess-123', title: 'Renamed', created_at: '', updated_at: '', message_count: 0 };
    const fetchMock = makeFetchOk(updated);
    vi.stubGlobal('fetch', fetchMock);
    const result = await sessionsApi.rename('sess-123', { title: 'Renamed' });
    expect(result.title).toBe('Renamed');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string).title).toBe('Renamed');
  });

  it('throws APIError on non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetchError(404, 'Session not found'));
    await expect(sessionsApi.get('bad-id')).rejects.toThrow('Session not found');
    await expect(sessionsApi.get('bad-id')).rejects.toBeInstanceOf(APIError);
  });
});

describe('API client — healthApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ready() calls GET /api/ready', async () => {
    const body = {
      status: 'ready',
      active_provider: 'local_ollama',
      dependencies: { database: { healthy: true }, ollama: { healthy: true }, cloud_provider: { is_ready: false } },
    };
    vi.stubGlobal('fetch', makeFetchOk(body));
    const result = await healthApi.ready();
    expect(result.status).toBe('ready');
    expect(result.dependencies.database.healthy).toBe(true);
  });
});

describe('API client — modelsApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('status() calls GET /api/models', async () => {
    const body = {
      active_provider: 'local_ollama',
      default_provider: 'local_ollama',
      hardware_profile: { device: 'MacBook', ram_total_gb: 8, recommended_local_model: 'llama3.2:3b' },
      providers: {
        local_ollama: { configured_model: 'llama3.2:3b', is_healthy: true, status_message: 'OK' },
        cloud_openai: { configured_model: 'gpt-4o-mini', is_healthy: false, status_message: 'No key' },
      },
    };
    vi.stubGlobal('fetch', makeFetchOk(body));
    const result = await modelsApi.status();
    expect(result.active_provider).toBe('local_ollama');
    expect(result.providers.local_ollama.is_healthy).toBe(true);
  });

  it('switch() calls POST /api/models/switch', async () => {
    const fetchMock = makeFetchOk({ active_provider: 'cloud_openai' });
    vi.stubGlobal('fetch', fetchMock);
    await modelsApi.switch('cloud_openai');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/models/switch');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).provider).toBe('cloud_openai');
  });
});

describe('API client — streamChat', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls onError if fetch response is not ok', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', makeFetchError(503, 'Ollama offline'));
    const controller = streamChat('sess-1', 'test', {
      onStatus: vi.fn(),
      onCitations: vi.fn(),
      onToken: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    // Wait for async error propagation
    await new Promise((r) => setTimeout(r, 50));
    expect(onError).toHaveBeenCalled();
    const err = onError.mock.calls[0][0] as Error;
    expect(err.message).toContain('Ollama offline');
    controller.abort();
  });

  it('returns an AbortController', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const controller = streamChat('sess-1', 'test', {
      onStatus: vi.fn(),
      onCitations: vi.fn(),
      onToken: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    expect(controller).toBeInstanceOf(AbortController);
    controller.abort();
  });
});
