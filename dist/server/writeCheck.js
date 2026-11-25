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
 *                 `crossOrigin` (since v0.27.0) names the writes another site's page may make: a
 *                 method, an exact path (the request's `url` without its query) and exact origins.
 *                 Such a write passes with an `Origin` from that list, whatever `Sec-Fetch-Site`
 *                 says. The option only adds: without that `Origin` the rules above decide, so a
 *                 missing `Origin` or a cross-site `Sec-Fetch-Site` alone is refused as ever, and
 *                 the game's own pages keep writing to the same path.
 *                 It needs no token and no state. A game with a CSRF token keeps it as a second
 *                 layer: both must pass. The answer names the reason, never a header's value.
 * Depends on:     ./trust (trustedPeers, HeaderValue), ./exactOrigins
 * Source:         seasonal-cases apps/server/src/app.ts (`sameOrigin`, `sameSiteWrites`) at
 *                 073f9ad. Changed: a write with neither header is refused (Cases lets it pass),
 *                 the forwarded host is read behind a trusted proxy (K60).
 * Spec:           docs/concepts/shared-server-parts.md §3; docs/DECISIONS.md K60
 */
import { exactOrigins } from './exactOrigins.js';
import { trustedPeers } from './trust.js';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFUSED = (reason) => ({ ok: false, reason });
// A header that must be one string; `undefined` when absent, null when repeated or empty.
function single(value) {
    if (value === undefined)
        return undefined;
    return typeof value === 'string' && value !== '' ? value : null;
}
// The host the request was made to: the proxy's `X-Forwarded-Host` only from a trusted peer.
function requestHost(request, isProxy) {
    const forwarded = isProxy(request.peer) ? single(request.headers['x-forwarded-host']) : undefined;
    return forwarded === undefined ? single(request.headers['host']) : forwarded;
}
// An Origin's host and the request's host, written the same way (default ports dropped).
function sameHost(origin, host) {
    try {
        const url = new URL(origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:')
            return null;
        return url.host === new URL(`${url.protocol}//${host}`).host;
    }
    catch {
        return null;
    }
}
// Where the browser says the request came from, judged against the host it was made to.
function originDecision(request, origin, isProxy) {
    const host = requestHost(request, isProxy);
    if (host === null || host === undefined)
        return REFUSED('bad-header');
    return sameHost(origin, host) === true ? { ok: true } : REFUSED('origin-mismatch');
}
// Whether the request is one of the named writes, from one of its origins. The list is read
// once, so a bad entry fails at start-up.
function namedWrites(list) {
    const writes = list.map(({ method, path, origins }) => {
        if (!/^\/[^?#*]*$/.test(path))
            throw new RangeError('A cross-origin path is an exact path');
        return { method: method.toUpperCase(), path, from: exactOrigins(origins, 'crossOrigin') };
    });
    return (request, origin) => {
        const method = request.method.toUpperCase();
        const path = request.url?.split('?')[0];
        return writes.some((w) => w.method === method && w.path === path && w.from.has(origin));
    };
}
export function writeCheck(options = {}) {
    const isProxy = trustedPeers(options.trustedProxies ?? []);
    const named = namedWrites(options.crossOrigin ?? []);
    return (request) => {
        if (SAFE.has(request.method.toUpperCase()))
            return { ok: true };
        const site = single(request.headers['sec-fetch-site']);
        const origin = single(request.headers['origin']);
        if (site === null || origin === null)
            return REFUSED('bad-header');
        if (origin !== undefined && named(request, origin))
            return { ok: true };
        if (site === undefined && origin === undefined)
            return REFUSED('no-origin');
        if (site !== undefined && site !== 'same-origin' && site !== 'none') {
            return REFUSED('cross-site');
        }
        return origin === undefined ? { ok: true } : originDecision(request, origin, isProxy);
    };
}
