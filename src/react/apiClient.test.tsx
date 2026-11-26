// @vitest-environment jsdom
/**
 * @file   src/react/apiClient.test.tsx
 * @brief  The API client's one error shape and the loading hook (K70).
 *
 * Responsibility: the URL under base path and prefix, the session cookie, the CSRF token on writes
 *                 only, JSON both ways and a 204; one `ApiError` for a refusal (with the code,
 *                 reason and body, or `ERROR` without them) and for no answer; `onAnswer` sees
 *                 every answer and a true one leaves the call pending; and the hook's idle,
 *                 loading, ready and failed, never another path's answer, with a late answer
 *                 dropped.
 * Depends on:     vitest, @testing-library/react
 * Source:         new in the kit (K70).
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, basePathOf, createApiClient, type Api } from '../apiClient.js';
import { useApiGet } from './useApiGet.js';

afterEach(cleanup);

const answer = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });
const client = (response: Response | Error, extra = {}) => {
  const send = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  return { send, api: createApiClient({ basePath: '/games/x/', fetch: send, ...extra }) };
};
const sent = (send: ReturnType<typeof client>['send']) =>
  send.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];

describe('createApiClient', () => {
  it('calls under the base path and prefix with the cookie, and reads JSON', async () => {
    const c = client(answer(200, { a: 1 }));
    expect(await c.api('/session')).toEqual({ a: 1 });
    const [url, init] = sent(c.send);
    expect(url).toBe('/games/x/api/v1/session');
    expect(init).toEqual({ method: 'GET', headers: {}, credentials: 'same-origin' });
  });

  it('sends JSON and the CSRF token on a write, not on a read', async () => {
    const csrf = () => 'tok';
    const c = client(answer(200, {}), { csrf, prefix: 'api' });
    await c.api('/a', { method: 'POST', body: { x: 1 } });
    const [url, init] = sent(c.send);
    expect(url).toBe('/games/x/api/a');
    expect(init.headers).toEqual({ 'content-type': 'application/json', 'x-csrf-token': 'tok' });
    expect(init.body).toBe('{"x":1}');
    for (const method of ['GET', 'HEAD']) {
      const read = client(answer(200, {}), { csrf });
      await read.api('/a', { method });
      expect(sent(read.send)[1].headers).toEqual({});
    }
  });

  it('answers a 204 with undefined and an empty 200 with an empty object', async () => {
    expect(await client(answer(204)).api('/a')).toBeUndefined();
    expect(await client(new Response('not json', { status: 200 })).api('/a')).toEqual({});
  });
});

describe('retry (v0.34.0)', () => {
  const stepUp = { code: 'AUTH_STEP_UP_REQUIRED' };
  const refusedThen = (second: number) => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(answer(403, stepUp))
      .mockResolvedValue(answer(second, second === 200 ? { done: true } : stepUp));
    const retry = vi.fn((error: ApiError) => Promise.resolve(error.code === stepUp.code));
    let token = 'before';
    const api = createApiClient({ basePath: '/', fetch: send, retry, csrf: () => token });
    retry.mockImplementationOnce((error) => {
      token = 'after';
      return Promise.resolve(error.code === stepUp.code);
    });
    return { send, retry, api };
  };

  it('sends the same method, path and body once more, with the token of then', async () => {
    const { send, retry, api } = refusedThen(200);
    const body = { amount: 5 };
    expect(await api('/pay', { method: 'POST', body })).toEqual({ done: true });
    expect(retry).toHaveBeenCalledTimes(1);
    const calls = send.mock.calls as [string, RequestInit & { headers: Record<string, string> }][];
    expect(calls.map(([url, init]) => [url, init.method, init.body])).toEqual([
      ['/api/v1/pay', 'POST', '{"amount":5}'],
      ['/api/v1/pay', 'POST', '{"amount":5}'],
    ]);
    expect(calls.map(([, init]) => init.headers['x-csrf-token'])).toEqual(['before', 'after']);
  });

  it('retries once, never twice: the second refusal stands', async () => {
    const { send, retry, api } = refusedThen(403);
    await expect(api('/pay', { method: 'POST' })).rejects.toMatchObject({ code: stepUp.code });
    expect(send).toHaveBeenCalledTimes(2);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('sends nothing again when the game says no, without an answer, or without the option', async () => {
    const no = vi.fn(() => false);
    const refused = client(answer(403, stepUp), { retry: no });
    await expect(refused.api('/a')).rejects.toBeInstanceOf(ApiError);
    expect(refused.send).toHaveBeenCalledTimes(1);
    const silent = client(new TypeError('offline'), { retry: no });
    await expect(silent.api('/a')).rejects.toMatchObject({ code: 'NO_ANSWER' });
    expect(no).toHaveBeenCalledTimes(1);
    const plain = client(answer(403, stepUp));
    await expect(plain.api('/a')).rejects.toBeInstanceOf(ApiError);
    expect(plain.send).toHaveBeenCalledTimes(1);
  });
});

describe('the one error shape', () => {
  it('throws one error shape for a refusal, with the code, reason and body', async () => {
    const body = { code: 'PASSWORD_WEAK', reason: 'tooShort', field: 'password' };
    const error = await client(answer(422, body))
      .api('/a')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'PASSWORD_WEAK', reason: 'tooShort', body });
  });

  it('names ERROR without a code, and NO_ANSWER without an answer', async () => {
    await expect(client(new Response('oops', { status: 502 })).api('/a')).rejects.toMatchObject({
      status: 502,
      code: 'ERROR',
      reason: null,
      body: null,
    });
    await expect(client(new Error('offline')).api('/a')).rejects.toMatchObject({
      status: 0,
      code: 'NO_ANSWER',
    });
  });

  it('shows every answer to onAnswer, and leaves the call open when it returns true', async () => {
    const seen: [number, string | null][] = [];
    const watch = (r: Response, code: string | null): boolean => {
      seen.push([r.status, code]);
      return r.status === 401;
    };
    await client(answer(200, {}), { onAnswer: watch }).api('/a');
    let settled = false;
    const leaving = client(answer(401, { code: 'UNAUTHORIZED' }), { onAnswer: watch }).api('/a');
    void leaving.finally(() => (settled = true));
    await new Promise((done) => setTimeout(done, 20));
    expect(settled).toBe(false);
    expect(seen).toEqual([
      [200, null],
      [401, 'UNAUTHORIZED'],
    ]);
  });

  it("reads the page's folder as the default base path", async () => {
    expect(basePathOf('https://site.example/games/bingo/index.html#/x')).toBe('/games/bingo/');
    const send = vi.fn(() => Promise.resolve(answer(200, {})));
    vi.stubGlobal('fetch', send);
    await createApiClient()('/x');
    expect(send.mock.calls[0]).toHaveProperty('0', `${basePathOf(document.baseURI)}api/v1/x`);
    vi.unstubAllGlobals();
  });
});

// A client whose calls the test answers by hand, in any order.
function held() {
  const waiting = new Map<string, { ok: (v: unknown) => void; no: (e: unknown) => void }>();
  const api = ((path: string) =>
    new Promise((ok, no) => waiting.set(path, { ok, no }))) as unknown as Api;
  return { api, waiting };
}

describe('useApiGet', () => {
  it('is idle without a path, loads, and gives the value', async () => {
    const h = held();
    const { result, rerender } = renderHook((path: string | null) => useApiGet(h.api, path), {
      initialProps: null as string | null,
    });
    expect(result.current).toEqual({ kind: 'idle' });
    rerender('/a');
    expect(result.current).toEqual({ kind: 'loading' });
    act(() => h.waiting.get('/a')?.ok(5));
    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'ready', value: 5 });
    });
  });

  it('gives the whole error, and NO_ANSWER for anything else thrown', async () => {
    const h = held();
    const { result, rerender } = renderHook((path: string) => useApiGet(h.api, path), {
      initialProps: '/a',
    });
    act(() => h.waiting.get('/a')?.no(new ApiError(404, 'NOT_FOUND')));
    await waitFor(() => {
      expect(result.current).toMatchObject({ kind: 'failed', error: { code: 'NOT_FOUND' } });
    });
    rerender('/b');
    act(() => h.waiting.get('/b')?.no(new TypeError('x')));
    await waitFor(() => {
      expect(result.current).toMatchObject({ kind: 'failed', error: { code: 'NO_ANSWER' } });
    });
  });

  it("never shows another path's answer, and drops a late one", async () => {
    const h = held();
    const { result, rerender } = renderHook((path: string) => useApiGet(h.api, path), {
      initialProps: '/a',
    });
    act(() => h.waiting.get('/a')?.ok('A'));
    await waitFor(() => {
      expect(result.current.kind).toBe('ready');
    });
    rerender('/b');
    expect(result.current).toEqual({ kind: 'loading' });
    const late = h.waiting.get('/b');
    rerender('/c');
    await act(async () => {
      late?.ok('B');
      await Promise.resolve();
    });
    expect(result.current).toEqual({ kind: 'loading' });
    act(() => h.waiting.get('/c')?.ok('C'));
    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'ready', value: 'C' });
    });
  });
});
