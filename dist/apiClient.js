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
    status;
    code;
    reason;
    body;
    name = 'ApiError';
    constructor(status, code, 
    // The server's detail when it gives one (e.g. a weak password's reason).
    reason = null, 
    // The whole answer body, for a game's own fields; null without one.
    body = null) {
        super(`${String(status)} ${code}`);
        this.status = status;
        this.code = code;
        this.reason = reason;
        this.body = body;
    }
}
export function basePathOf(pageUrl) {
    return new URL('.', pageUrl).pathname;
}
function requestOf(call, token) {
    const method = call.method ?? 'GET';
    const headers = {};
    if (call.text !== undefined)
        headers['content-type'] = 'application/json';
    const writes = method !== 'GET' && method !== 'HEAD';
    if (writes && token !== null)
        headers['x-csrf-token'] = token;
    return {
        method,
        headers,
        credentials: 'same-origin',
        ...(call.text === undefined ? {} : { body: call.text }),
    };
}
const textOf = (body, key) => {
    const value = body?.[key];
    return typeof value === 'string' ? value : null;
};
// The answer's JSON; null for a 204 or a body that is no JSON.
const bodyOf = (response) => response.status === 204 ? Promise.resolve(null) : response.json().catch(() => null);
// The answer, or the one error for no answer at all.
async function answerTo(send, url, init) {
    try {
        return await send(url, init);
    }
    catch {
        throw new ApiError(0, 'NO_ANSWER');
    }
}
// The call with its body written out once, so a second sending carries the same bytes.
const written = (call) => ({
    ...call,
    text: call.body === undefined ? undefined : JSON.stringify(call.body),
});
// Whether a refused call goes out again: only for a real answer, and only when the game says so.
async function again(options, error) {
    if (!(error instanceof ApiError) || error.status === 0)
        return false;
    return (await options.retry?.(error)) === true;
}
export function createApiClient(options = {}) {
    const prefix = options.prefix ?? 'api/v1';
    const once = async (path, call) => {
        const base = options.basePath ?? basePathOf(document.baseURI);
        const url = `${base}${prefix}${path}`;
        // Read at call time, so a test or a page that replaces fetch is heard.
        const response = await answerTo(options.fetch ?? fetch, url, requestOf(call, options.csrf?.() ?? null));
        const body = await bodyOf(response);
        const code = textOf(body, 'code');
        // The page is on its way to a sign-in: nothing may happen with this answer.
        if (options.onAnswer?.(response, code) === true)
            return new Promise(() => undefined);
        if (!response.ok) {
            throw new ApiError(response.status, code ?? 'ERROR', textOf(body, 'reason'), body);
        }
        return (response.status === 204 ? undefined : (body ?? {}));
    };
    return async (path, call = {}) => {
        const sent = written(call);
        try {
            return await once(path, sent);
        }
        catch (error) {
            if (!(await again(options, error)))
                throw error;
            return once(path, sent);
        }
    };
}
