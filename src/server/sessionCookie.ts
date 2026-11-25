/**
 * @file   src/server/sessionCookie.ts
 * @brief  The session cookie's name, attributes and lifetime, the same in every game.
 *
 * Responsibility: `sessionCookie` gives the cookie's name, `Secure` flag and path: the base path
 *                 in every case (since v0.27.0 also on plain http, development), with a plain name
 *                 on http, `__Host-<name>` at the root of its own host (the prefix requires
 *                 `Path=/`) and `__Secure-<name>` under a path of the website's host. `sessionCookieOptions` gives the
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
  // The game's cookie name without a prefix, letters, digits and `_`: `sbr_session`.
  readonly name: string;
  // Served over https (false only in development on plain http).
  readonly secure: boolean;
  // The path the game is served under on its host; `/` when it has the host to itself.
  readonly basePath?: string;
}

export interface SessionCookieOptions {
  readonly path: string;
  readonly httpOnly: true;
  readonly sameSite: 'lax';
  readonly secure: boolean;
  // Seconds; absent for a clear.
  readonly maxAge?: number;
}

export function sessionCookie(input: SessionCookieInput): SessionCookie {
  const basePath = input.basePath ?? '/';
  if (!/^\w+$/.test(input.name)) throw new RangeError('The cookie name is letters, digits and _');
  if (!/^\/[\w./-]*$/.test(basePath) || basePath.includes('..')) {
    throw new RangeError('The base path is a plain path starting with /');
  }
  const path = basePath === '/' ? basePath : basePath.replace(/\/$/, '');
  if (!input.secure) return { name: input.name, secure: false, path };
  const prefix = path === '/' ? '__Host-' : '__Secure-';
  return { name: `${prefix}${input.name}`, secure: true, path };
}

export function sessionCookieOptions(
  cookie: SessionCookie,
  absoluteDays?: number,
): SessionCookieOptions {
  const base = {
    path: cookie.path,
    httpOnly: true,
    sameSite: 'lax',
    secure: cookie.secure,
  } as const;
  if (absoluteDays === undefined) return base;
  const maxAge = Math.floor(absoluteDays * 24 * 3600);
  // A zero, negative or non-finite length would set a cookie that ends at once or never.
  if (!Number.isFinite(absoluteDays) || maxAge < 1) {
    throw new RangeError('The session length is a positive number of days');
  }
  return { ...base, maxAge };
}
