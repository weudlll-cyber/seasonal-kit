/**
 * @file   src/server/sessionCookie.test.ts
 * @brief  The session cookie's name, attributes and lifetime (v0.21.0, K63).
 *
 * Responsibility: the name and path in each of the three places a game runs (plain http,
 *                 its own host, a path of the website's host); the attributes (`HttpOnly`,
 *                 `SameSite=Lax`, `Secure`, path); `Max-Age` equal to the session's absolute
 *                 length in seconds for 7 and 30 days and fractions of a day; a clear that
 *                 carries the same attributes and no `Max-Age`; and the refusals (a name or a
 *                 path that could add an attribute, a length that is zero, negative or not a
 *                 number).
 * Depends on:     vitest
 * Source:         new in the kit (K63).
 */
import { describe, expect, it } from 'vitest';

import { sessionCookie, sessionCookieOptions } from './sessionCookie.js';

describe('sessionCookie', () => {
  it.each([
    [undefined, '/'],
    ['/', '/'],
    ['/games/mini/', '/games/mini'],
  ])('is plain on http, under the base path %j', (basePath, path) => {
    const input = { name: 'sbr_session', secure: false };
    expect(sessionCookie(basePath === undefined ? input : { ...input, basePath })).toEqual({
      name: 'sbr_session',
      secure: false,
      path,
    });
  });

  it('is __Host- at the root of its own host', () => {
    expect(sessionCookie({ name: 'sbr_session', secure: true })).toEqual({
      name: '__Host-sbr_session',
      secure: true,
      path: '/',
    });
  });

  it('is __Secure- with its path under a path of the website host', () => {
    expect(sessionCookie({ name: 'smg_session', secure: true, basePath: '/games/mini/' })).toEqual({
      name: '__Secure-smg_session',
      secure: true,
      path: '/games/mini',
    });
  });

  it.each(['', 'a b', 'a;b', 'a=b', '__Host-x', 'x\r\ny'])('refuses the name %j', (name) => {
    expect(() => sessionCookie({ name, secure: true })).toThrow(RangeError);
  });

  it.each(['games', '/a;b', '/a/../b', '/a b', ''])('refuses the base path %j', (basePath) => {
    expect(() => sessionCookie({ name: 'x', secure: true, basePath })).toThrow(RangeError);
  });
});

describe('sessionCookieOptions', () => {
  const cookie = sessionCookie({ name: 'x', secure: true, basePath: '/g' });

  it('sets HttpOnly, SameSite=Lax, Secure and the path', () => {
    expect(sessionCookieOptions(cookie, 7)).toMatchObject({
      path: '/g',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
  });

  it.each([
    [7, 604_800],
    [30, 2_592_000],
    [0.5, 43_200],
    [1 / 3, 28_800],
  ])('lasts as long as the session: %s days is %s seconds', (days, seconds) => {
    expect(sessionCookieOptions(cookie, days).maxAge).toBe(seconds);
  });

  it('a clear carries the same attributes and no Max-Age', () => {
    const clear = sessionCookieOptions(cookie);
    expect(clear).toEqual({ path: '/g', httpOnly: true, sameSite: 'lax', secure: true });
    expect('maxAge' in clear).toBe(false);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.00001])(
    'refuses a length of %s days',
    (days) => {
      expect(() => sessionCookieOptions(cookie, days)).toThrow(RangeError);
    },
  );
});
