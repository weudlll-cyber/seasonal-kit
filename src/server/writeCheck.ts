/**
 * @file   src/server/writeCheck.ts
 * @brief  The CSRF check for state-changing requests: where did the browser say it came from?
 *
 * Responsibility: `writeCheck(options)` gives the function that decides for one request,
 *                 framework-free, from its method, its headers and the TCP peer (the trusted
 *                 proxies are read once, so a bad range fails at start-up, not per request). GET, HEAD and OPTIONS pass. Any other method passes
 *                 only when the browser names where it came from and that is this site:
 *                 - `Sec-Fetch-Site`, when present, is `same-origin` or `none`;
 *                 - `Origin`, when present, has the host the request was made to. That is the
 *                   `Host` header, or behind the website's proxy the `X-Forwarded-Host`, which is
 *                   believed only when the TCP peer is one of `trustedProxies`, as the identity
 *                   checks believe their headers (a header from anyone else is ignored);
 *                 - a write that names neither `Origin` nor `Sec-Fetch-Site` is refused (K60);
 *                 - a repeated or malformed header, `Origin: null` and a missing host are refused.
 *                 It needs no token and no state. A game with a CSRF token keeps it as a second
 *                 layer: both must pass. The answer names the reason, never a header's value.
 * Depends on:     ./trust (trustedPeers, HeaderValue)
 * Source:         seasonal-cases apps/server/src/app.ts (`sameOrigin`, `sameSiteWrites`) at
 *                 073f9ad. Changed: a write with neither header is refused (Cases lets it pass),
 *                 the forwarded host is read behind a trusted proxy (K60).
 * Spec:           docs/concepts/shared-server-parts.md §3; docs/DECISIONS.md K60
 */
import { trustedPeers, type HeaderValue } from './trust.js';

export interface WriteRequest {
  readonly method: string;
  readonly headers: Readonly<Record<string, HeaderValue>>;
  // The TCP peer (`request.socket.remoteAddress`), never `request.ip` after a proxy rewrite.
  readonly peer: string | undefined;
}

export interface WriteCheckOptions {
  // Addresses and CIDR ranges of the website's proxy; without them no forwarded host is believed.
  readonly trustedProxies?: readonly string[];
}

export type WriteDecision =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'cross-site' | 'origin-mismatch' | 'no-origin' | 'bad-header';
    };

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFUSED = (reason: 'cross-site' | 'origin-mismatch' | 'no-origin' | 'bad-header') =>
  ({ ok: false, reason }) as const;

// A header that must be one string; `undefined` when absent, null when repeated or empty.
function single(value: HeaderValue): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'string' && value !== '' ? value : null;
}

// The host the request was made to: the proxy's `X-Forwarded-Host` only from a trusted peer.
function requestHost(
  request: WriteRequest,
  isProxy: (peer: string | undefined) => boolean,
): string | undefined | null {
  const forwarded = isProxy(request.peer) ? single(request.headers['x-forwarded-host']) : undefined;
  return forwarded === undefined ? single(request.headers['host']) : forwarded;
}

// An Origin's host and the request's host, written the same way (default ports dropped).
function sameHost(origin: string, host: string): boolean | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.host === new URL(`${url.protocol}//${host}`).host;
  } catch {
    return null;
  }
}

// Where the browser says the request came from, judged against the host it was made to.
function originDecision(
  request: WriteRequest,
  origin: string,
  isProxy: (peer: string | undefined) => boolean,
): WriteDecision {
  const host = requestHost(request, isProxy);
  if (host === null || host === undefined) return REFUSED('bad-header');
  return sameHost(origin, host) === true ? { ok: true } : REFUSED('origin-mismatch');
}

export function writeCheck(
  options: WriteCheckOptions = {},
): (request: WriteRequest) => WriteDecision {
  const isProxy = trustedPeers(options.trustedProxies ?? []);
  return (request) => {
    if (SAFE.has(request.method.toUpperCase())) return { ok: true };
    const site = single(request.headers['sec-fetch-site']);
    const origin = single(request.headers['origin']);
    if (site === null || origin === null) return REFUSED('bad-header');
    if (site === undefined && origin === undefined) return REFUSED('no-origin');
    if (site !== undefined && site !== 'same-origin' && site !== 'none') {
      return REFUSED('cross-site');
    }
    return origin === undefined ? { ok: true } : originDecision(request, origin, isProxy);
  };
}
