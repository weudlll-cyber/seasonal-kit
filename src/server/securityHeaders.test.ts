/**
 * @file   src/server/securityHeaders.test.ts
 * @brief  Each directive and header of the security set, its modes, and the Fastify hook (K63).
 *
 * Responsibility: every directive of the policy by name; `upgrade-insecure-requests` only over
 *                 https; scripts never `'unsafe-inline'` under
 *                 any option; styles only with `inlineStyles`; `frame-ancestors` in website mode
 *                 (own origin, the website's origin if another, `ancestors` refused), standalone
 *                 (own origin and the allowlist) and admin (none, `DENY`, Trusted Types);
 *                 `X-Frame-Options` only where nobody else may frame; never HSTS; the plain
 *                 headers; refusal of an origin that could add a directive; the rendered policy
 *                 text; and the hook setting every header on a response, from a set or a function
 *                 of the url.
 * Depends on:     vitest
 * Source:         new in the kit (K63).
 */
import { describe, expect, it } from 'vitest';

import { renderPolicy, securityHeaderSet, securityHeadersHook } from './securityHeaders.js';

const website = securityHeaderSet({ mode: 'website' });
const standalone = securityHeaderSet({ mode: 'standalone' });

const BAD_ORIGINS = [
  'https://a.example; script-src *',
  'https://a.example/path',
  'javascript:alert(1)',
  '*',
  "'self'",
  'https://a.example ',
];

describe('the policy', () => {
  it('has every directive, closed to its own origin by default', () => {
    expect(website.directives).toEqual({
      'default-src': ["'self'"],
      'base-uri': ["'none'"],
      'form-action': ["'self'"],
      'object-src': ["'none'"],
      'img-src': ["'self'", 'data:'],
      'font-src': ["'self'"],
      'style-src': ["'self'"],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'connect-src': ["'self'"],
      'frame-src': ["'self'"],
      'frame-ancestors': ["'self'"],
    });
  });

  it('never lets a script run inline, whatever the options', () => {
    for (const set of [
      website,
      standalone,
      securityHeaderSet({ mode: 'standalone', inlineStyles: true, blobImages: true, admin: true }),
    ]) {
      expect(set.directives['script-src']).toEqual(["'self'"]);
      expect(renderPolicy(set.directives)).not.toMatch(/script-src[^;]*unsafe/);
    }
  });

  it('allows inline styles and blob images only when asked', () => {
    const open = securityHeaderSet({ mode: 'standalone', inlineStyles: true, blobImages: true });
    expect(open.directives['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
    expect(open.directives['img-src']).toEqual(["'self'", 'data:', 'blob:']);
    expect(standalone.directives['style-src']).toEqual(["'self'"]);
  });

  it('upgrades insecure requests only for a game served over https', () => {
    const https = securityHeaderSet({ mode: 'website', secure: true });
    expect(https.directives['upgrade-insecure-requests']).toEqual([]);
    expect(renderPolicy(https.directives)).toMatch(/; upgrade-insecure-requests$/);
    for (const plain of [website, securityHeaderSet({ mode: 'website', secure: false })]) {
      expect(plain.directives).not.toHaveProperty('upgrade-insecure-requests');
    }
  });

  it('frames what it is told to, or nothing', () => {
    const chat = securityHeaderSet({
      mode: 'website',
      frames: ['https://site.example/'.slice(0, -1)],
    });
    expect(chat.directives['frame-src']).toEqual(['https://site.example']);
    expect(securityHeaderSet({ mode: 'website', frames: [] }).directives['frame-src']).toEqual([
      "'none'",
    ]);
  });
});

describe('a frame source with a path (v0.27.0)', () => {
  it.each([
    'https://site.example/embed/chat',
    'https://site.example:8443/embed/',
    'https://site.example/a%20b/~c_d.e-f',
  ])('writes %s into frame-src as given', (source) => {
    const set = securityHeaderSet({ mode: 'website', frames: [source] });
    expect(set.directives['frame-src']).toEqual([source]);
  });

  it.each([
    'http://site.example/embed/chat',
    'https://site.example/embed?theme=dark',
    'https://site.example/embed#x',
    'https://site.example/*',
    'https://*.example/embed',
    'https://site.example/a;script-src',
    'https://site.example/a,b',
    'https://site.example/a b',
    "https://site.example/'self'",
    '/embed/chat',
  ])('refuses %j', (source) => {
    expect(() => securityHeaderSet({ mode: 'website', frames: [source] })).toThrow(RangeError);
  });

  it('is for frames only: an ancestor stays a plain origin', () => {
    const ancestors = ['https://site.example/embed'];
    expect(() => securityHeaderSet({ mode: 'standalone', ancestors })).toThrow(RangeError);
  });
});

describe('who may frame the game', () => {
  it('website mode: its own origin, which is the website, and nobody else', () => {
    expect(website.directives['frame-ancestors']).toEqual(["'self'"]);
    expect(website.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('website mode on another origin: that origin too, and no X-Frame-Options', () => {
    const set = securityHeaderSet({ mode: 'website', websiteOrigin: 'https://site.example' });
    expect(set.directives['frame-ancestors']).toEqual(["'self'", 'https://site.example']);
    expect(set.headers).not.toHaveProperty('x-frame-options');
  });

  it('website mode refuses an embed allowlist', () => {
    expect(() =>
      securityHeaderSet({ mode: 'website', ancestors: ['https://other.example'] }),
    ).toThrow(/website only/);
  });

  it('standalone: its own origin and the allowlist, and no X-Frame-Options', () => {
    const set = securityHeaderSet({
      mode: 'standalone',
      ancestors: ['https://a.example', 'http://localhost:5173'],
    });
    expect(set.directives['frame-ancestors']).toEqual([
      "'self'",
      'https://a.example',
      'http://localhost:5173',
    ]);
    expect(set.headers).not.toHaveProperty('x-frame-options');
    expect(standalone.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('admin: nobody, DENY and Trusted Types', () => {
    const set = securityHeaderSet({
      mode: 'standalone',
      ancestors: ['https://a.example'],
      admin: true,
    });
    expect(set.directives['frame-ancestors']).toEqual(["'none'"]);
    expect(set.directives['require-trusted-types-for']).toEqual(["'script'"]);
    expect(set.headers['x-frame-options']).toBe('DENY');
  });

  it.each(BAD_ORIGINS)(
    'refuses the ancestor %j, which could add a directive or a source',
    (origin) => {
      expect(() => securityHeaderSet({ mode: 'standalone', ancestors: [origin] })).toThrow(
        RangeError,
      );
    },
  );

  it('refuses a frame source or a website origin that is not plain', () => {
    expect(() => securityHeaderSet({ mode: 'website', frames: ['*'] })).toThrow(RangeError);
    expect(() => securityHeaderSet({ mode: 'website', websiteOrigin: "'self'" })).toThrow(
      RangeError,
    );
  });
});

describe('the other headers', () => {
  it('are the fixed set, and never HSTS', () => {
    for (const set of [website, standalone]) {
      expect(set.headers).toMatchObject({
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
        'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
      });
      expect(Object.keys(set.headers)).not.toContain('strict-transport-security');
    }
  });
});

describe('renderPolicy and the hook', () => {
  it('writes name and sources, directives separated by "; "', () => {
    expect(renderPolicy({ 'default-src': ["'self'"], 'img-src': ["'self'", 'data:'] })).toBe(
      "default-src 'self'; img-src 'self' data:",
    );
  });

  const reply = (): { sent: Record<string, string>; header: (n: string, v: string) => void } => {
    const sent: Record<string, string> = {};
    return { sent, header: (name, value) => void (sent[name] = value) };
  };

  it('sets the policy and every header on the response', () => {
    const r = reply();
    let done = 0;
    securityHeadersHook(website)({ url: '/x' }, r, () => (done += 1));
    expect(done).toBe(1);
    expect(r.sent['content-security-policy']).toBe(renderPolicy(website.directives));
    expect(r.sent['x-content-type-options']).toBe('nosniff');
    expect(Object.keys(r.sent)).toHaveLength(1 + Object.keys(website.headers).length);
  });

  it('picks the set by url, so the admin paths get their own', () => {
    const admin = securityHeaderSet({ mode: 'standalone', admin: true });
    const hook = securityHeadersHook((url) => (url.startsWith('/admin') ? admin : standalone));
    const a = reply();
    const g = reply();
    hook({ url: '/admin/x' }, a, () => undefined);
    hook({ url: '/play' }, g, () => undefined);
    expect(a.sent['x-frame-options']).toBe('DENY');
    expect(a.sent['content-security-policy']).toContain("require-trusted-types-for 'script'");
    expect(g.sent['x-frame-options']).toBe('SAMEORIGIN');
  });
});
