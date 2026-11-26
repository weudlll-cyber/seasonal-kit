/**
 * @file   src/apiClient.ts
 * @brief  A game client's calls to its own server: one client, one error shape.
 *
 * Responsibility: `createApiClient(options)` gives `api(path, { method, body })`, which calls
 *                 `<basePath><prefix><path>` with the page's session cookie, sends the CSRF token
 *                 on every call but GET and HEAD, writes and reads JSON, and answers a 204 with
 *                 `undefined`. Every failure is one `ApiError`: `status`, the server's `code`
 *                 (`'ERROR'` when it names none), its `reason` or null, and the whole answer body
 *                 for a game's own fields; no answer at all is status 0, code `'NO_ANSWER'`.
 *                 `onAnswer` sees every answer before it is judged: a game reports a lost session
 *                 there, or sends the page to the website's sign-in (`signInAgainAfter`,
 *                 ./websiteSignIn) and returns true, and the call then never settles, as the page
 *                 is leaving. `retry` (since v0.34.0) is asked about a refusing answer; when it
 *                 says true, the same method, path and body are sent once more (with the CSRF
 *                 token as it is then), and that second answer stands. `basePathOf` is the folder the page is served from ("/" alone,
 *                 "/games/bingo/" inside the website).
 * Depends on:     nothing (the browser's fetch)
 * Source:         seasonal-bingo-royale apps/web/src/shell/http.ts at 8d20904 and
 *                 seasonal-mini-games the same path at 9e3c6f3 (73 % alike), which share the
 *                 `ApiError(status, code, reason)` shape (K70); Seasonal Cases' `lib/api.ts`
 *                 (073f9ad) throws the server's sentence instead. Left in the games: what counts
 *                 as a lost session, their extra error fields and their error sentences.
 */
export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    // The server's detail when it gives one (e.g. a weak password's reason).
    readonly reason: string | null = null,
    // The whole answer body, for a game's own fields; null without one.
    readonly body: unknown = null,
  ) {
    super(`${String(status)} ${code}`);
  }
}

export function basePathOf(pageUrl: string): string {
  return new URL('.', pageUrl).pathname;
}

export interface ApiClientOptions {
  // The folder the client is served from. Default: the page's (`basePathOf(document.baseURI)`).
  readonly basePath?: string;
  // Between the base path and a call's path. Default `api/v1`.
  readonly prefix?: string;
  // The session's CSRF token, asked at every call; null sends none.
  readonly csrf?: () => string | null;
  // Every answer, before it is judged. Return true when the page is leaving for a sign-in.
  readonly onAnswer?: (response: Response, code: string | null) => boolean | undefined;
  // A refused call: true (after whatever the game does first, e.g. a two-factor step-up) sends
  // the same request once more. Never asked a second time, nor when no answer came.
  readonly retry?: (error: ApiError) => boolean | Promise<boolean>;
  // Tests: the fetch to use.
  readonly fetch?: typeof fetch;
}

export interface ApiCall {
  readonly method?: string;
  readonly body?: unknown;
}

export type Api = <T>(path: string, call?: ApiCall) => Promise<T>;

function requestOf(call: ReturnType<typeof written>, token: string | null): RequestInit {
  const method = call.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (call.text !== undefined) headers['content-type'] = 'application/json';
  const writes = method !== 'GET' && method !== 'HEAD';
  if (writes && token !== null) headers['x-csrf-token'] = token;
  return {
    method,
    headers,
    credentials: 'same-origin',
    ...(call.text === undefined ? {} : { body: call.text }),
  };
}

const textOf = (body: unknown, key: string): string | null => {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value : null;
};

// The answer's JSON; null for a 204 or a body that is no JSON.
const bodyOf = (response: Response): Promise<unknown> =>
  response.status === 204 ? Promise.resolve(null) : response.json().catch(() => null);

// The answer, or the one error for no answer at all.
async function answerTo(send: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await send(url, init);
  } catch {
    throw new ApiError(0, 'NO_ANSWER');
  }
}

// The call with its body written out once, so a second sending carries the same bytes.
const written = (call: ApiCall): ApiCall & { readonly text: string | undefined } => ({
  ...call,
  text: call.body === undefined ? undefined : JSON.stringify(call.body),
});

// Whether a refused call goes out again: only for a real answer, and only when the game says so.
async function again(options: ApiClientOptions, error: unknown): Promise<boolean> {
  if (!(error instanceof ApiError) || error.status === 0) return false;
  return (await options.retry?.(error)) === true;
}

export function createApiClient(options: ApiClientOptions = {}): Api {
  const prefix = options.prefix ?? 'api/v1';
  const once = async <T>(path: string, call: ReturnType<typeof written>): Promise<T> => {
    const base = options.basePath ?? basePathOf(document.baseURI);
    const url = `${base}${prefix}${path}`;
    // Read at call time, so a test or a page that replaces fetch is heard.
    const response = await answerTo(
      options.fetch ?? fetch,
      url,
      requestOf(call, options.csrf?.() ?? null),
    );
    const body = await bodyOf(response);
    const code = textOf(body, 'code');
    // The page is on its way to a sign-in: nothing may happen with this answer.
    if (options.onAnswer?.(response, code) === true) return new Promise<T>(() => undefined);
    if (!response.ok) {
      throw new ApiError(response.status, code ?? 'ERROR', textOf(body, 'reason'), body);
    }
    return (response.status === 204 ? undefined : (body ?? {})) as T;
  };
  return async <T>(path: string, call: ApiCall = {}): Promise<T> => {
    const sent = written(call);
    try {
      return await once<T>(path, sent);
    } catch (error) {
      if (!(await again(options, error))) throw error;
      return once<T>(path, sent);
    }
  };
}
