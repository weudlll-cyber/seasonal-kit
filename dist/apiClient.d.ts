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
export declare class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly reason: string | null;
    readonly body: unknown;
    name: string;
    constructor(status: number, code: string, reason?: string | null, body?: unknown);
}
export declare function basePathOf(pageUrl: string): string;
export interface ApiClientOptions {
    readonly basePath?: string;
    readonly prefix?: string;
    readonly csrf?: () => string | null;
    readonly onAnswer?: (response: Response, code: string | null) => boolean | undefined;
    readonly retry?: (error: ApiError) => boolean | Promise<boolean>;
    readonly fetch?: typeof fetch;
}
export interface ApiCall {
    readonly method?: string;
    readonly body?: unknown;
}
export type Api = <T>(path: string, call?: ApiCall) => Promise<T>;
export declare function createApiClient(options?: ApiClientOptions): Api;
