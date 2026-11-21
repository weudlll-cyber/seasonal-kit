/**
 * @file   src/server/guards.test.ts
 * @brief  The return path, the login hop, brute force (the rate limiter), recovery codes and
 *         session revocation.
 *
 * Responsibility:
 *                 - `next` stays under the base path or becomes it: never another site, a
 *                   scheme, "//", a backslash, a control character, or more than 512
 *                   characters. Bad base and login paths throw.
 *                 - The login hop encodes each nested parameter on its own.
 *                 - The limiter lets the limit pass, refuses with the delay, refills evenly,
 *                   keeps keys apart, forgets idle keys, and refuses a rule without tokens. A
 *                   two-factor brute force stops at the game's limit.
 *                 - Recovery codes in both games' styles: ten, unique, in their form, hashed so
 *                   that only the right code matches, the hex style forgiving of case, spaces and
 *                   dashes.
 *                 - Ended sessions reach every listener, even past one that throws.
 *                 Mini Games' rateLimit.test.ts (866df03), plus the rest.
 * Depends on:     vitest
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2, §4; docs/AUTH.md
 */
import { describe, expect, it, vi } from 'vitest';

import { RateLimiter } from './rateLimit.js';
import { looksLikeRecoveryCode, newRecoveryCodes, recoveryHash } from './recoveryCodes.js';
import { safeNext, websiteLoginLocation } from './returnPath.js';
import { SessionEnds } from './sessionEnds.js';

const BASE = '/games/bingo/';

describe('the return path', () => {
  it('keeps a page under the base path, its hash included', () => {
    expect(safeNext('/games/bingo/#/match/ABC123', BASE)).toBe('/games/bingo/#/match/ABC123');
    expect(safeNext('/games/bingo/?x=%2F', BASE)).toBe('/games/bingo/?x=%2F');
  });

  it.each([
    'https://evil.example/',
    '//evil.example/games/bingo/',
    '/games/bingo//evil.example',
    '/games/bingo/\\evil',
    '/games/bingo/\n',
    '/games/bingo/ x',
    '/games/bingo-other/',
    '/games/',
    `/games/bingo/${'a'.repeat(510)}`,
    42,
    undefined,
  ])('turns %j into the base path', (next) => {
    expect(safeNext(next, BASE)).toBe(BASE);
  });

  it('refuses a base or login path that is no local path', () => {
    for (const base of ['games/bingo/', '/games/bingo', '//evil/', '/a\\b/', 'https://x/']) {
      expect(() => safeNext('/x', base)).toThrow(TypeError);
    }
    for (const login of ['https://evil.example/login?next=', '//evil/login?next=', '/a\\b']) {
      expect(() => websiteLoginLocation(login, BASE, BASE)).toThrow(TypeError);
    }
  });

  it('builds the login hop with each nested parameter encoded on its own', () => {
    const location = websiteLoginLocation('/login?next=', BASE, '/games/bingo/#/match/X');
    expect(location).toBe(
      `/login?next=${encodeURIComponent(`${BASE}auth/website?next=${encodeURIComponent('/games/bingo/#/match/X')}`)}`,
    );
    expect(websiteLoginLocation('/login?next=', BASE, 'https://evil.example')).toBe(
      `/login?next=${encodeURIComponent(`${BASE}auth/website?next=${encodeURIComponent(BASE)}`)}`,
    );
  });
});

describe('the rate limiter (brute force)', () => {
  it('lets the limit pass, then refuses with the delay until a token is back', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 3, windowMs: 3_000 }, () => now);
    expect([1, 2, 3].map(() => limiter.take('a').allowed)).toEqual([true, true, true]);
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterMs: 1_000 });
    expect(limiter.take('b').allowed).toBe(true);
    now = 1_000;
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
  });

  it('stops a two-factor brute force at the game’s limit (Bingo 5, Mini Games 10 a 15 min)', () => {
    for (const limit of [5, 10]) {
      const limiter = new RateLimiter({ limit, windowMs: 15 * 60_000 }, () => 0);
      const tries = Array.from({ length: 1_000 }, () => limiter.take('account-1').allowed);
      expect(tries.filter(Boolean)).toHaveLength(limit);
    }
  });

  it('forgets keys idle for a whole window, so the map stays small', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 5, windowMs: 1_000 }, () => now);
    for (let i = 0; i < 999; i += 1) limiter.take(`old-${String(i)}`);
    expect(limiter.size).toBe(999);
    now = 1_000;
    limiter.take('new');
    expect(limiter.size).toBe(1);
  });

  it('refuses a rule without tokens or time, and uses the real clock by default', () => {
    expect(() => new RateLimiter({ limit: 0, windowMs: 1_000 })).toThrow(RangeError);
    expect(() => new RateLimiter({ limit: 1, windowMs: 0 })).toThrow(RangeError);
    expect(new RateLimiter({ limit: 1, windowMs: 1_000 }).take('x').allowed).toBe(true);
  });
});

describe('recovery codes', () => {
  it('draws ten unique "xxxx-xxxx" codes without look-alikes (Mini Games)', () => {
    const codes = newRecoveryCodes('grouped');
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/);
  });

  it('draws ten unique 10-character hex codes (Bingo)', () => {
    const codes = newRecoveryCodes('hex');
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[0-9a-f]{10}$/);
  });

  it('hashes so only the right code matches, as each game stores them', () => {
    const [code = ''] = newRecoveryCodes('hex');
    const stored = recoveryHash(code, 'hex');
    expect(recoveryHash(` ${code.slice(0, 5).toUpperCase()}-${code.slice(5)} `, 'hex')).toEqual(
      stored,
    );
    expect(
      recoveryHash(
        code.replace(/.$/, (c) => (c === '0' ? '1' : '0')),
        'hex',
      ),
    ).not.toEqual(stored);
    // Mini Games' hashes were stored as typed, dash and case included.
    expect(recoveryHash('abcd-efgh', 'grouped')).not.toEqual(recoveryHash('abcdefgh', 'grouped'));
    expect(recoveryHash('abcd-efgh', 'grouped')).toHaveLength(32);
  });

  it('tells a recovery code from a TOTP code', () => {
    expect(looksLikeRecoveryCode('123456')).toBe(false);
    expect(looksLikeRecoveryCode(' 123456 ')).toBe(false);
    expect(looksLikeRecoveryCode('abcd-efgh')).toBe(true);
    expect(looksLikeRecoveryCode('0a1b2c3d4e')).toBe(true);
  });
});

describe('session revocation', () => {
  it('tells every listener which sessions ended, none for an empty list', () => {
    const ends = new SessionEnds();
    const gateway = vi.fn();
    const audit = vi.fn();
    ends.onEnd(gateway);
    ends.onEnd(audit);
    ends.end([]);
    expect(gateway).not.toHaveBeenCalled();
    ends.end(['s1', 's2']);
    expect(gateway).toHaveBeenCalledWith(['s1', 's2']);
    expect(audit).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('reaches every listener past one that throws, then throws its error', () => {
    const ends = new SessionEnds();
    const after = vi.fn();
    ends.onEnd(() => {
      throw new Error('socket gone');
    });
    ends.onEnd(() => {
      throw new Error('second');
    });
    ends.onEnd(after);
    expect(() => {
      ends.end(['s1']);
    }).toThrow('socket gone');
    expect(after).toHaveBeenCalledWith(['s1']);
  });

  it('throws an Error even when a listener throws something else', () => {
    const ends = new SessionEnds();
    ends.onEnd(() => {
      // A listener's own mistake, which the kit must survive: it throws no Error object.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'not an error';
    });
    expect(() => {
      ends.end(['s1']);
    }).toThrow(new Error('not an error'));
  });
});
