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
  // Website mode, when the game is served from an origin other than the website's.
  readonly websiteOrigin?: string;
  // Standalone: the sites that may frame the game (plain origins).
  readonly ancestors?: Sources;
  // What the game may frame: plain origins or `'self'`; default `['self']`; empty is none.
  readonly frames?: Sources;
  // Allow inline styles (a development page). Never scripts.
  readonly inlineStyles?: boolean;
  // Allow blob: images (a canvas the game draws and shows).
  readonly blobImages?: boolean;
  // The admin app: framed by nobody, Trusted Types for scripts.
  readonly admin?: boolean;
}

export interface SecurityHeaderSet {
  readonly directives: Readonly<Record<string, Sources>>;
  // Every header but the policy's own, in lower case.
  readonly headers: Readonly<Record<string, string>>;
}

const SELF = "'self'";
// Only a plain origin reaches a header, so no stored value can add a directive.
const PLAIN_ORIGIN = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
const PERMISSIONS = 'camera=(), microphone=(), geolocation=(), payment=()';

function origins(list: Sources, what: string, allowSelf: boolean): Sources {
  for (const o of list) {
    if (!PLAIN_ORIGIN.test(o) && !(allowSelf && o === SELF)) {
      throw new RangeError(`${what} must be plain origins`);
    }
  }
  return list;
}

function ancestorsOf(options: SecurityHeaderOptions): Sources {
  if (options.admin === true) return ["'none'"];
  if (options.mode === 'website') {
    if (options.ancestors !== undefined) {
      throw new RangeError('A website install is framed by the website only: no ancestors');
    }
    const site = options.websiteOrigin === undefined ? [] : [options.websiteOrigin];
    return [SELF, ...origins(site, 'The website origin', false)];
  }
  return [SELF, ...origins(options.ancestors ?? [], 'ancestors', false)];
}

export function securityHeaderSet(options: SecurityHeaderOptions): SecurityHeaderSet {
  const frames = origins(options.frames ?? [SELF], 'frames', true);
  const ancestors = ancestorsOf(options);
  const directives: Record<string, Sources> = {
    'default-src': [SELF],
    'base-uri': ["'none'"],
    'form-action': [SELF],
    'object-src': ["'none'"],
    'img-src': [SELF, 'data:', ...(options.blobImages === true ? ['blob:'] : [])],
    'font-src': [SELF],
    'style-src': [SELF, ...(options.inlineStyles === true ? ["'unsafe-inline'"] : [])],
    'script-src': [SELF],
    'connect-src': [SELF],
    'frame-src': frames.length === 0 ? ["'none'"] : frames,
    'frame-ancestors': ancestors,
    ...(options.admin === true ? { 'require-trusted-types-for': ["'script'"] } : {}),
  };
  // X-Frame-Options has no list: with another site allowed, frame-ancestors decides alone.
  const onlyOwn = ancestors.length === 1;
  const frameOptions =
    options.admin === true ? 'DENY' : onlyOwn && ancestors[0] === SELF ? 'SAMEORIGIN' : undefined;
  return {
    directives,
    headers: {
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'permissions-policy': PERMISSIONS,
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      ...(frameOptions === undefined ? {} : { 'x-frame-options': frameOptions }),
    },
  };
}

// The policy as the header's text: `name value value; name value`.
export function renderPolicy(directives: SecurityHeaderSet['directives']): string {
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(' '))
    .join('; ');
}

interface ReplyLike {
  header(name: string, value: string): unknown;
}
interface RequestLike {
  readonly url: string;
}

// A Fastify `onRequest` hook: `app.addHook('onRequest', securityHeadersHook(set))`.
export function securityHeadersHook(
  source: SecurityHeaderSet | ((url: string) => SecurityHeaderSet),
): (request: RequestLike, reply: ReplyLike, done: () => void) => void {
  return (request, reply, done) => {
    const set = typeof source === 'function' ? source(request.url) : source;
    reply.header('content-security-policy', renderPolicy(set.directives));
    for (const [name, value] of Object.entries(set.headers)) reply.header(name, value);
    done();
  };
}
