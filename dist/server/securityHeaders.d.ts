/**
 * @file   src/server/securityHeaders.ts
 * @brief  The security headers of a game's pages as data, and a function that sets them in Fastify.
 *
 * Responsibility: `securityHeaderSet(options)` returns the Content Security Policy's directives
 *                 and the other headers as plain objects, so a test reads each one and a game
 *                 hands them to any server. The policy is Bingo's strict one, with Mini Games'
 *                 configurable ancestors and its admin rules:
 *                 - `script-src 'self'`, never `'unsafe-inline'`; `style-src 'self'` unless the
 *                   game says `inlineStyles` (a development page; a finding in a scan);
 *                 - `frame-ancestors`: in website mode (`mode: 'website'`) the game's own origin,
 *                   which is the website's, and the `websiteOrigin` when it is another origin,
 *                   nobody else, and `ancestors` is refused there; standalone, its own origin and
 *                   the `ancestors` (an embed allowlist of plain origins);
 *                 - `frame-src` from `frames` (plain origins or `'self'`; none gives `'none'`);
 *                 - `admin`: framed by nobody (`frame-ancestors 'none'`, `X-Frame-Options: DENY`)
 *                   and Trusted Types required for scripts;
 *                 - no HSTS, ever: the website sends it in website mode (it owns the whole
 *                   host), the TLS proxy standalone, and a game's own header would be lost or
 *                   doubled in an nginx location;
 *                 - `Referrer-Policy: no-referrer`, `nosniff`, a `Permissions-Policy` that denies
 *                   camera, microphone, location and payment, and same-origin opener and
 *                   resource policies; `X-Frame-Options: SAMEORIGIN` only where no other site may
 *                   frame the game (it knows no list).
 *                 Every origin is checked to be plain, so no stored value can add a directive.
 *                 `securityHeadersHook` sets a set on each response as a Fastify `onRequest`
 *                 hook, from one set or a function of the request's url (the admin paths).
 * Source:         seasonal-bingo-royale apps/server/src/http/plugins/securityHeaders.ts at
 *                 8d20904 (the policy, `style-src 'self'`, its ZAP baseline 2 medium to 0) and
 *                 seasonal-mini-games the same path at 9e3c6f3 (`ancestors`, admin rules, the
 *                 plain-origin check). Seasonal Cases' `helmetOptions` (web.ts) is replaced on
 *                 adoption. Left in the games: the helmet registration and the admin path test.
 * Spec:           docs/concepts/shared-server-parts.md §4
 */
type Sources = readonly string[];
export interface SecurityHeaderOptions {
    readonly mode: 'website' | 'standalone';
    readonly websiteOrigin?: string;
    readonly ancestors?: Sources;
    readonly frames?: Sources;
    readonly inlineStyles?: boolean;
    readonly blobImages?: boolean;
    readonly admin?: boolean;
}
export interface SecurityHeaderSet {
    readonly directives: Readonly<Record<string, Sources>>;
    readonly headers: Readonly<Record<string, string>>;
}
export declare function securityHeaderSet(options: SecurityHeaderOptions): SecurityHeaderSet;
export declare function renderPolicy(directives: SecurityHeaderSet['directives']): string;
interface ReplyLike {
    header(name: string, value: string): unknown;
}
interface RequestLike {
    readonly url: string;
}
export declare function securityHeadersHook(source: SecurityHeaderSet | ((url: string) => SecurityHeaderSet)): (request: RequestLike, reply: ReplyLike, done: () => void) => void;
export {};
