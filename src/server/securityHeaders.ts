/**
 * @file   src/server/securityHeaders.ts
 * @brief  The security headers of a game's pages as data, and a function that sets them in Fastify.
 *
 * Responsibility: `securityHeaderSet(options)` returns the Content Security Policy's directives
 *                 and the other headers as plain objects, so a test reads each one and a game
 *                 hands them to any server. The policy is Bingo's strict one, with Mini Games'
 *                 configurable ancestors and its admin rules:
 *                 - `script-src 'self'`, never `'unsafe-inline'`, and `script-src-attr 'none'`
 *                   (no inline event handler, v0.27.0); `style-src 'self'` unless the game says
 *                   `inlineStyles` (a development page; a finding in a scan);
 *                 - `upgrade-insecure-requests` only when the game says it is served over https
 *                   (`secure`, v0.27.0): on plain-http development it would break every request;
 *                 - `frame-ancestors`: in website mode (`mode: 'website'`) the game's own origin,
 *                   which is the website's, and the `websiteOrigin` when it is another origin,
 *                   nobody else, and `ancestors` is refused there; standalone, its own origin and
 *                   the `ancestors` (an embed allowlist of plain origins);
 *                 - `frame-src` from `frames` (plain origins, an https origin followed by a path
 *                   since v0.27.0, a plain-http one with a path only on a development host
 *                   (localhost, 127.0.0.1, [::1], *.localhost, *.test; since v0.34.0), or
 *                   `'self'`; none gives `'none'`);
 *                 - `admin`: framed by nobody (`frame-ancestors 'none'`, `X-Frame-Options: DENY`)
 *                   and Trusted Types required for scripts;
 *                 - no HSTS, ever: the website sends it in website mode (it owns the whole
 *                   host), the TLS proxy standalone, and a game's own header would be lost or
 *                   doubled in an nginx location;
 *                 - `Referrer-Policy: no-referrer`, `nosniff`, a `Permissions-Policy` that denies
 *                   camera, microphone, location and payment, and same-origin opener and
 *                   resource policies; `X-Frame-Options: SAMEORIGIN` only where no other site may
 *                   frame the game (it knows no list).
 *                 Every origin (and a frame source's path) is checked, so no stored value can add
 *                 a directive.
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
  // What the game may frame: plain origins, `https://host/path` (no query, fragment or
  // wildcard; `http://` with a path only on a local development host) or `'self'`; default
  // `['self']`; empty is none.
  readonly frames?: Sources;
  // Served over https (as `sessionCookie` is told): browsers then upgrade http addresses.
  // Left out or false: no upgrade, for plain-http development.
  readonly secure?: boolean;
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
// A path of plain characters: nothing that ends a source or a directive.
const PATH = String.raw`(:\d{1,5})?(\/(?:[\w.~-]|%[0-9A-Fa-f]{2})*)+$`;
// An https origin and a path.
const HTTPS_PATH = new RegExp(String.raw`^https:\/\/[A-Za-z0-9.-]+` + PATH);
// Plain http with a path only for a development host on this machine (since v0.34.0).
const LOCAL_HOST = String.raw`(?:localhost|127\.0\.0\.1|\[::1\]|(?:[A-Za-z0-9-]+\.)+(?:localhost|test))`;
const LOCAL_PATH = new RegExp(String.raw`^http:\/\/` + LOCAL_HOST + PATH);
const PERMISSIONS = 'camera=(), microphone=(), geolocation=(), payment=()';

function origins(list: Sources, what: string): Sources {
  if (!list.every((o) => PLAIN_ORIGIN.test(o))) {
    throw new RangeError(`${what} must be plain origins`);
  }
  return list;
}

function frameSources(list: Sources): Sources {
  const forms = [PLAIN_ORIGIN, HTTPS_PATH, LOCAL_PATH];
  if (!list.every((s) => s === SELF || forms.some((form) => form.test(s)))) {
    throw new RangeError(
      'frames must be plain origins, https addresses with a path, or such on a local host',
    );
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
    return [SELF, ...origins(site, 'The website origin')];
  }
  return [SELF, ...origins(options.ancestors ?? [], 'ancestors')];
}

export function securityHeaderSet(options: SecurityHeaderOptions): SecurityHeaderSet {
  const frames = frameSources(options.frames ?? [SELF]);
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
    'script-src-attr': ["'none'"],
    'connect-src': [SELF],
    'frame-src': frames.length === 0 ? ["'none'"] : frames,
    'frame-ancestors': ancestors,
    // A directive without a value.
    ...(options.secure === true ? { 'upgrade-insecure-requests': [] } : {}),
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
