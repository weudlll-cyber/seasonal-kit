// @vitest-environment jsdom
/**
 * @file   src/websiteSignIn.test.ts
 * @brief  Website mode: sign-in and login links back to the page shown; signing in again goes
 *         back to the same page, at most once a minute, and never to another host.
 *
 * Responsibility: the hrefs carry the page (path, query and hash) as `next`; a route that is
 *                 not a path on this site throws. `signInAgain` goes once a minute at most per
 *                 route and not at all without storage. `signInAgainAfter` goes only for an
 *                 answer whose header names a local route. Mini Games' websiteSignIn.test.ts
 *                 (91b23bc), plus the login hop, the per-route guard and the host check.
 * Depends on:     vitest, jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  signInAgain,
  signInAgainAfter,
  websiteLoginHref,
  websiteSignInHref,
} from './websiteSignIn.js';

const SIGN_IN = '/games/mini-games/auth/website';
const HEADER = 'x-smg-session-ended';
const next = (page: string): string => `?next=${encodeURIComponent(page)}`;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('the sign-in and login links', () => {
  it('return to the page shown: path, query and hash', () => {
    window.history.replaceState(null, '', '/games/mini-games/?x=1#/match/ABC123');
    const page = '/games/mini-games/?x=1#/match/ABC123';
    expect(websiteSignInHref(SIGN_IN)).toBe(`${SIGN_IN}${next(page)}`);
    expect(websiteLoginHref('/games/bingo/auth/website')).toBe(
      `/games/bingo/auth/website/login${next(page)}`,
    );
  });

  it('return to a page they are given', () => {
    expect(websiteLoginHref(SIGN_IN, '/games/mini-games/#/')).toBe(
      `${SIGN_IN}/login${next('/games/mini-games/#/')}`,
    );
  });

  it.each(['https://evil.example/auth', '//evil.example/auth', '/\\evil', '/a\\b', 'auth/website'])(
    'refuse %s as the route',
    (route) => {
      expect(() => websiteSignInHref(route)).toThrow(TypeError);
      expect(() => websiteLoginHref(route)).toThrow(TypeError);
    },
  );
});

describe('signing in again', () => {
  it('goes back to the page shown, once a minute at most', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    window.history.replaceState(null, '', '/games/mini-games/admin/?x=1#/settings');
    const go = vi.fn();
    expect(signInAgain(SIGN_IN, go)).toBe(true);
    expect(go).toHaveBeenCalledWith(`${SIGN_IN}${next('/games/mini-games/admin/?x=1#/settings')}`);
    vi.setSystemTime(1_000_000 + 59_000);
    expect(signInAgain(SIGN_IN, go)).toBe(false);
    expect(go).toHaveBeenCalledTimes(1);
    vi.setSystemTime(1_000_000 + 61_000);
    expect(signInAgain(SIGN_IN, go)).toBe(true);
    expect(go).toHaveBeenCalledTimes(2);
  });

  it('keeps one guard per sign-in route', () => {
    const go = vi.fn();
    expect(signInAgain(SIGN_IN, go)).toBe(true);
    expect(signInAgain('/games/bingo/auth/website', go)).toBe(true);
    expect(go).toHaveBeenCalledTimes(2);
  });

  it('does not go without storage: there would be no loop guard', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const go = vi.fn();
    expect(signInAgain(SIGN_IN, go)).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });

  it('leaves the page by default', () => {
    // jsdom does not navigate: it reports "Not implemented: navigation" on its own console
    // and stays, so the page is unchanged and the guard is set.
    const before = window.location.href;
    expect(signInAgain(SIGN_IN)).toBe(true);
    expect(window.location.href).toBe(before);
    expect(signInAgain(SIGN_IN)).toBe(false);
  });
});

describe('signing in again after an answer', () => {
  it('goes only for an answer that says the session ended', () => {
    window.history.replaceState(null, '', '/games/mini-games/#/match/ABC123');
    const go = vi.fn();
    expect(signInAgainAfter(new Response('{}'), HEADER, go)).toBe(false);
    const ended = new Response('{}', { headers: { [HEADER]: SIGN_IN } });
    expect(signInAgainAfter(ended, HEADER, go)).toBe(true);
    expect(go).toHaveBeenCalledWith(`${SIGN_IN}${next('/games/mini-games/#/match/ABC123')}`);
  });

  it('reads only the game header it is given', () => {
    const go = vi.fn();
    const ended = new Response('{}', { headers: { 'x-sbr-session-ended': SIGN_IN } });
    expect(signInAgainAfter(ended, HEADER, go)).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });

  it.each(['https://evil.example/auth', '//evil.example', '/\\evil.example'])(
    'never follows a header that names %s',
    (route) => {
      const go = vi.fn();
      const ended = new Response('{}', { headers: { [HEADER]: route } });
      expect(signInAgainAfter(ended, HEADER, go)).toBe(false);
      expect(go).not.toHaveBeenCalled();
    },
  );
});
