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
import { type HeaderValue } from './trust.js';
export interface WriteRequest {
    readonly method: string;
    readonly headers: Readonly<Record<string, HeaderValue>>;
    readonly peer: string | undefined;
}
export interface WriteCheckOptions {
    readonly trustedProxies?: readonly string[];
}
export type WriteDecision = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly reason: 'cross-site' | 'origin-mismatch' | 'no-origin' | 'bad-header';
};
export declare function writeCheck(options?: WriteCheckOptions): (request: WriteRequest) => WriteDecision;
