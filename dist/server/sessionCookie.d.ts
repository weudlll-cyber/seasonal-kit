/**
 * @file   src/server/sessionCookie.ts
 * @brief  The session cookie's name, attributes and lifetime, the same in every game.
 *
 * Responsibility: `sessionCookie` gives the cookie's name, `Secure` flag and path: plain on http
 *                 (development); `__Host-<name>` at the root of its own host (the prefix requires
 *                 `Path=/`); `__Secure-<name>` with `Path=<base path>` when the game is served
 *                 under a path of the website's host. `sessionCookieOptions` gives the
 *                 attributes a cookie plugin sets: `HttpOnly`, `SameSite=Lax`, `Secure` and the
 *                 path, and, when given the session's absolute length in days, a `Max-Age` of
 *                 exactly that length, so the browser never keeps a cookie the server has already
 *                 ended (the game passes the length of the running mode: 7 days after a website
 *                 sign-in, its own otherwise). Called without a length it gives the attributes a
 *                 clear needs: a `__Host-` or `__Secure-` cookie is only removed with its own
 *                 `Secure` and path. Framework-free; the plugin and the token stay in the game.
 * Source:         seasonal-bingo-royale apps/server/src/auth/sessionPlugin.ts (`cookieConfig`,
 *                 `setSessionCookie`, `clearSessionCookie`, `cookieOptions`) at 8d20904, the
 *                 version whose lifetime follows the session (Mini Games' fixed 30 days outlives a
 *                 website session by 23). Generalised: the base name is the game's.
 * Spec:           docs/concepts/shared-server-parts.md §3
 */
export interface SessionCookie {
    readonly name: string;
    readonly secure: boolean;
    readonly path: string;
}
export interface SessionCookieInput {
    readonly name: string;
    readonly secure: boolean;
    readonly basePath?: string;
}
export interface SessionCookieOptions {
    readonly path: string;
    readonly httpOnly: true;
    readonly sameSite: 'lax';
    readonly secure: boolean;
    readonly maxAge?: number;
}
export declare function sessionCookie(input: SessionCookieInput): SessionCookie;
export declare function sessionCookieOptions(cookie: SessionCookie, absoluteDays?: number): SessionCookieOptions;
