/**
 * @file   src/server/writeCheck.test.ts
 * @brief  The CSRF check: each case of the rule, also behind the website's proxy (K60).
 *
 * Responsibility: safe methods pass whatever they carry; a write passes only with a same-site
 *                 `Sec-Fetch-Site` or an `Origin` of the request's own host; a write with
 *                 neither header, a cross-site or same-site one, a foreign `Origin`, `Origin:
 *                 null`, a scheme that is no web scheme and a repeated or empty header is
 *                 refused with its reason; default ports do not matter. Behind the proxy
 *                 (`trustedProxies`) the `X-Forwarded-Host` is the request's host, but only when
 *                 the TCP peer is the proxy: from any other peer, and with no proxy configured,
 *                 it is ignored, so a forged one cannot make a foreign Origin pass. A bad proxy
 *                 range fails when the check is built.
 * Depends on:     vitest
 * Source:         new in the kit (K60, K63).
 */
import { describe, expect, it } from 'vitest';

import { writeCheck, type WriteRequest } from './writeCheck.js';

const PROXY = '10.0.0.7';
const check = writeCheck();
const behind = writeCheck({ trustedProxies: [PROXY] });

const post = (
  headers: WriteRequest['headers'],
  peer: string | undefined = '203.0.113.9',
): WriteRequest => ({ method: 'POST', headers, peer });

describe('safe methods', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('%s passes with no header at all', (method) => {
    expect(check({ method, headers: {}, peer: undefined })).toEqual({ ok: true });
  });
});

const host = 'game.example';

// [name, headers, reason]
const REFUSED_WRITES = [
  ['neither Origin nor Sec-Fetch-Site', { host }, 'no-origin'],
  ['a cross-site fetch', { 'sec-fetch-site': 'cross-site', host }, 'cross-site'],
  ['a same-site one (another subdomain)', { 'sec-fetch-site': 'same-site', host }, 'cross-site'],
  ['a foreign Origin', { origin: 'https://evil.example', host }, 'origin-mismatch'],
  [
    'a foreign Origin on the same host name, another port',
    { origin: 'https://game.example:8443', host },
    'origin-mismatch',
  ],
  [
    'a foreign Origin with a same-origin Sec-Fetch-Site',
    { 'sec-fetch-site': 'same-origin', origin: 'https://evil.example', host },
    'origin-mismatch',
  ],
  ['Origin: null', { origin: 'null', host }, 'origin-mismatch'],
  ['an Origin that is no web address', { origin: 'file:///x', host }, 'origin-mismatch'],
  ['an Origin that is no address', { origin: 'not a url', host }, 'origin-mismatch'],
  ['an Origin with no host to compare', { origin: 'https://game.example' }, 'bad-header'],
  [
    'a repeated Origin',
    { origin: ['https://game.example', 'https://evil.example'], host },
    'bad-header',
  ],
  [
    'a repeated Sec-Fetch-Site',
    { 'sec-fetch-site': ['same-origin', 'same-origin'], host },
    'bad-header',
  ],
  ['an empty Origin', { origin: '', host }, 'bad-header'],
] as const;

describe('a write directly to the game', () => {
  it.each([
    ['a same-origin fetch', { 'sec-fetch-site': 'same-origin', host }],
    ['a user-initiated one', { 'sec-fetch-site': 'none', host }],
    ['an Origin of its own host', { origin: 'https://game.example', host }],
    ['an Origin with the default port spelled out', { origin: 'https://game.example:443', host }],
    [
      'an Origin on its own non-default port',
      { origin: 'http://localhost:5173', host: 'localhost:5173' },
    ],
    [
      'both headers agreeing',
      { 'sec-fetch-site': 'same-origin', origin: 'https://game.example', host },
    ],
  ])('passes %s', (_name, headers) => {
    expect(check(post(headers))).toEqual({ ok: true });
  });

  it.each(REFUSED_WRITES)('refuses %s', (_name, headers, reason) => {
    expect(check(post(headers))).toEqual({ ok: false, reason });
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('judges %s the same', (method) => {
    expect(check({ method, headers: { host }, peer: undefined })).toEqual({
      ok: false,
      reason: 'no-origin',
    });
  });
});

describe('behind the website proxy', () => {
  // The proxy talks to the game as `game.internal` and tells it the host the browser used.
  const viaProxy = (origin: string, forwarded?: string): WriteRequest['headers'] => ({
    origin,
    host: 'game.internal:3000',
    ...(forwarded === undefined ? {} : { 'x-forwarded-host': forwarded }),
  });

  it('passes an Origin of the forwarded host when the peer is the proxy', () => {
    const request = post(viaProxy('https://site.example', 'site.example'), PROXY);
    expect(behind(request)).toEqual({ ok: true });
  });

  it('refuses the same Origin without a forwarded host: the game sees its internal host', () => {
    expect(behind(post(viaProxy('https://site.example'), PROXY))).toEqual({
      ok: false,
      reason: 'origin-mismatch',
    });
  });

  it('refuses a foreign Origin whatever the proxy forwards', () => {
    const request = post(viaProxy('https://evil.example', 'site.example'), PROXY);
    expect(behind(request)).toEqual({ ok: false, reason: 'origin-mismatch' });
  });

  it('ignores a forwarded host from any other peer: it cannot be forged', () => {
    const forged = post(viaProxy('https://evil.example', 'evil.example'), '198.51.100.4');
    expect(behind(forged)).toEqual({ ok: false, reason: 'origin-mismatch' });
    expect(behind(post(viaProxy('https://evil.example', 'evil.example'), undefined))).toEqual({
      ok: false,
      reason: 'origin-mismatch',
    });
  });

  it('ignores a forwarded host when no proxy is configured', () => {
    const request = post(viaProxy('https://evil.example', 'evil.example'), PROXY);
    expect(check(request)).toEqual({ ok: false, reason: 'origin-mismatch' });
  });

  it('refuses a repeated forwarded host from the proxy', () => {
    const request = post(viaProxy('https://site.example', 'site.example'), PROXY);
    const doubled = { ...request, headers: { ...request.headers, 'x-forwarded-host': ['a', 'b'] } };
    expect(behind(doubled)).toEqual({ ok: false, reason: 'bad-header' });
  });

  it('an IPv4-mapped peer and a range both count as the proxy', () => {
    const ranged = writeCheck({ trustedProxies: ['10.0.0.0/24'] });
    const request = post(viaProxy('https://site.example', 'site.example'), `::ffff:${PROXY}`);
    expect(ranged(request)).toEqual({ ok: true });
  });

  it('a bad range fails when the check is built', () => {
    expect(() => writeCheck({ trustedProxies: ['10.0.0.0/99'] })).toThrow(RangeError);
  });
});
