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
import * as crypto from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { RateLimiter } from './rateLimit.js';
import {
  looksLikeRecoveryCode,
  newRecoveryCodes,
  recoveryHash,
  recoveryLookups,
  recoveryMatches,
} from './recoveryCodes.js';
import { safeNext, websiteLoginLocation } from './returnPath.js';
import { SessionEnds } from './sessionEnds.js';

// The real functions, with randomBytes watchable so a test can force a repeated code.
vi.mock('node:crypto', async (importOriginal) => {
  const real = await importOriginal<typeof crypto>();
  return {
    ...real,
    randomBytes: vi.fn(real.randomBytes),
    timingSafeEqual: vi.fn(real.timingSafeEqual),
  };
});

const BASE = '/games/bingo/';

describe('the return path', () => {
  it('keeps a page under the base path, its hash included', () => {
    expect(safeNext('/games/bingo/#/match/ABC123', BASE)).toBe('/games/bingo/#/match/ABC123');
    expect(safeNext('/games/bingo/?x=%2F', BASE)).toBe('/games/bingo/?x=%2F');
    // Dots inside a name, or in the query or hash, are no segments.
    expect(safeNext('/games/bingo/file.v2/#/../x', BASE)).toBe('/games/bingo/file.v2/#/../x');
    expect(safeNext('/x', '/')).toBe('/x');
  });

  it.each([
    'https://evil.example/',
    '//evil.example/games/bingo/',
    '/games/bingo//evil.example',
    '/games/bingo/\\evil',
    // Review finding 4: dot segments, plain or percent-encoded, leave the base path.
    '/games/bingo/../../login',
    '/games/bingo/%2e%2e/%2E%2E/admin',
    '/games/bingo/./x',
    '/games/bingo/..',
    '/games/bingo/..?next=x',
    // Third review, finding 1: an encoded separator a proxy would decode.
    '/games/bingo/..%2fadmin',
    '/games/bingo/%2e%2e%2F',
    '/games/bingo/%5c..%5Cx',
    '/games/bingo/x%00',
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
});

describe('the base path and the login hop', () => {
  it('refuses a base or login path that is no local path', () => {
    for (const base of [
      'games/bingo/',
      '/games/bingo',
      '//evil/',
      '/a\\b/',
      'https://x/',
      '/games/../',
      '/./',
    ]) {
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
});

describe('the rate limiter (its rules and bounds)', () => {
  it('refuses a rule without tokens or time, and uses the real clock by default', () => {
    expect(() => new RateLimiter({ limit: 0, windowMs: 1_000 })).toThrow(RangeError);
    expect(() => new RateLimiter({ limit: 1, windowMs: 0 })).toThrow(RangeError);
    // Review finding 5: Infinity made every answer NaN; a fraction or a bad key cap too.
    expect(() => new RateLimiter({ limit: Infinity, windowMs: 1_000 })).toThrow(RangeError);
    expect(() => new RateLimiter({ limit: 1.5, windowMs: 1_000 })).toThrow(RangeError);
    expect(() => new RateLimiter({ limit: 1, windowMs: Infinity })).toThrow(RangeError);
    expect(() => new RateLimiter({ limit: 1, windowMs: 1_000 }, Date.now, 0)).toThrow(RangeError);
    expect(new RateLimiter({ limit: 1, windowMs: 1_000 }).take('x').allowed).toBe(true);
  });

  it('holds at most its key cap: idle keys go first, new keys wait while all are active', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 2, windowMs: 1_000 }, () => now, 3);
    for (const key of ['a', 'b', 'c']) limiter.take(key);
    expect(limiter.take('d')).toEqual({ allowed: false, retryAfterMs: 1_000 });
    expect(limiter.size).toBe(3);
    // A held key still gets its own answer.
    expect(limiter.take('a').allowed).toBe(true);
    now = 1_000;
    expect(limiter.take('d').allowed).toBe(true);
    expect(limiter.size).toBe(1);
  });

  it('drains nothing when the clock goes back', () => {
    let now = 10_000;
    const limiter = new RateLimiter({ limit: 2, windowMs: 1_000 }, () => now);
    expect(limiter.take('a').allowed).toBe(true);
    now = 0;
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
    now = 10_500;
    expect(limiter.take('a').allowed).toBe(true);
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
    const stored = recoveryHash(code, 'hex', KEY);
    expect(
      recoveryHash(` ${code.slice(0, 5).toUpperCase()}-${code.slice(5)} `, 'hex', KEY),
    ).toEqual(stored);
    const other = code.replace(/.$/, (c) => (c === '0' ? '1' : '0'));
    expect(recoveryHash(other, 'hex', KEY)).not.toEqual(stored);
    // Mini Games' hashes were stored as typed, dash and case included.
    expect(recoveryHash('abcd-efgh', 'grouped', KEY)).not.toEqual(
      recoveryHash('abcdefgh', 'grouped', KEY),
    );
    expect(recoveryHash('abcd-efgh', 'grouped', KEY)).toHaveLength(32);
  });
});

// The game's server key (DECISIONS K20): a test value, never a real one.
const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
const OTHER_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1));
// What v0.8.0 and the games stored: plain SHA-256 of the code's form.
const legacy = (form: string): Buffer => crypto.createHash('sha256').update(form).digest();

describe('recovery codes under a server key (D4)', () => {
  it('stores a new code as HMAC-SHA-256 under the key, not as plain SHA-256', () => {
    const stored = recoveryHash('abcd-efgh', 'grouped', KEY);
    expect(stored).toEqual(crypto.createHmac('sha256', KEY).update('abcd-efgh').digest());
    expect(stored).not.toEqual(legacy('abcd-efgh'));
    expect(recoveryMatches('abcd-efgh', 'grouped', stored, KEY)).toBe(true);
  });

  it('still verifies a legacy SHA-256 hash, in both styles', () => {
    expect(recoveryMatches('abcd-efgh', 'grouped', legacy('abcd-efgh'), KEY)).toBe(true);
    expect(recoveryMatches('AB12 cd-34ef', 'hex', legacy('ab12cd34ef'), KEY)).toBe(true);
    expect(recoveryLookups('abcd-efgh', 'grouped', KEY)).toEqual([
      recoveryHash('abcd-efgh', 'grouped', KEY),
      legacy('abcd-efgh'),
    ]);
  });

  it('refuses a keyed hash under another key, a wrong code, and a hash of the wrong length', () => {
    const stored = recoveryHash('abcd-efgh', 'grouped', KEY);
    expect(recoveryMatches('abcd-efgh', 'grouped', stored, OTHER_KEY)).toBe(false);
    expect(recoveryMatches('abcd-efgk', 'grouped', stored, KEY)).toBe(false);
    expect(recoveryMatches('abcd-efgh', 'grouped', stored.subarray(0, 31), KEY)).toBe(false);
    expect(recoveryMatches('abcd-efgh', 'grouped', Buffer.alloc(0), KEY)).toBe(false);
    // 32 elements but 64 bytes: no match, and no throw from timingSafeEqual.
    const wide = new Uint16Array(32) as unknown as Uint8Array;
    expect(recoveryMatches('abcd-efgh', 'grouped', wide, KEY)).toBe(false);
  });

  it('compares both hashes in constant time, whichever matches', () => {
    const spy = vi.mocked(crypto.timingSafeEqual);
    for (const stored of [
      recoveryHash('abcd-efgh', 'grouped', KEY),
      legacy('abcd-efgh'),
      Buffer.alloc(32),
    ]) {
      spy.mockClear();
      recoveryMatches('abcd-efgh', 'grouped', stored, KEY);
      expect(spy).toHaveBeenCalledTimes(2);
    }
  });
});

describe('the recovery key (D4, independent review of v0.9.0)', () => {
  it('refuses a key under 32 bytes, one byte repeated, or not bytes at all', () => {
    expect(() => recoveryHash('abcd-efgh', 'grouped', KEY.subarray(0, 31))).toThrow(RangeError);
    expect(() => recoveryLookups('abcd-efgh', 'grouped', KEY.subarray(0, 16))).toThrow(RangeError);
    expect(() => recoveryHash('abcd-efgh', 'grouped', Buffer.alloc(32))).toThrow(RangeError);
    expect(() => recoveryHash('abcd-efgh', 'grouped', Buffer.alloc(64, 7))).toThrow(RangeError);
    // A JavaScript caller's text key of the right length.
    const text = 'k'.repeat(16) + 'e'.repeat(16);
    expect(() => recoveryHash('abcd-efgh', 'grouped', text as unknown as Uint8Array)).toThrow(
      TypeError,
    );
  });

  it('refuses a bad key before it looks at the stored hash (review finding 4)', () => {
    expect(() => recoveryMatches('abcd-efgh', 'grouped', legacy('x'), KEY.subarray(0, 16))).toThrow(
      RangeError,
    );
    expect(() =>
      recoveryMatches('abcd-efgh', 'grouped', Buffer.alloc(0), KEY.subarray(0, 16)),
    ).toThrow(RangeError);
  });

  it('tells a recovery code from a TOTP code', () => {
    expect(looksLikeRecoveryCode('123456')).toBe(false);
    expect(looksLikeRecoveryCode(' 123456 ')).toBe(false);
    expect(looksLikeRecoveryCode('abcd-efgh')).toBe(true);
    expect(looksLikeRecoveryCode('0a1b2c3d4e')).toBe(true);
  });
});

describe('the rate limiter under a flood (second review)', () => {
  it('scans a full map at most once a tenth of the window, and refuses newcomers in between', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 2, windowMs: 1_000 }, () => now, 2);
    limiter.take('a');
    limiter.take('b');
    const prune = vi.spyOn(limiter as unknown as { prune: (t: number) => void }, 'prune');
    for (let i = 0; i < 50; i += 1) expect(limiter.take(`new-${String(i)}`).allowed).toBe(false);
    expect(prune).toHaveBeenCalledTimes(1);
    now = 100;
    limiter.take('late');
    expect(prune).toHaveBeenCalledTimes(2);
  });

  it('touches no bucket for a time that is not finite', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 }, () => now);
    now = Number.NaN;
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterMs: 1_000 });
    expect(limiter.size).toBe(0);
    now = 0;
    expect(limiter.take('a').allowed).toBe(true);
  });

  it('draws ten distinct codes even when the random source repeats itself', () => {
    const same = Buffer.from('0102030405', 'hex');
    vi.mocked(crypto.randomBytes)
      .mockReturnValueOnce(same as never)
      .mockReturnValueOnce(same as never);
    const codes = newRecoveryCodes('hex');
    expect(new Set(codes).size).toBe(10);
    expect(codes.filter((c) => c === '0102030405')).toHaveLength(1);
  });
});

describe('session revocation', () => {
  it('tells every listener at once which sessions ended, none for an empty list', async () => {
    const onError = vi.fn();
    const ends = new SessionEnds(onError);
    const gateway = vi.fn();
    const audit = vi.fn();
    ends.onEnd(gateway);
    ends.onEnd(audit);
    await ends.end([]);
    expect(gateway).not.toHaveBeenCalled();
    const done = ends.end(['s1', 's2']);
    // Called in the same turn, before anything is awaited: the sockets close now.
    expect(gateway).toHaveBeenCalledWith(['s1', 's2']);
    expect(audit).toHaveBeenCalledWith(['s1', 's2']);
    await done;
    expect(onError).not.toHaveBeenCalled();
  });

  // Second review, finding 2: end never rejects; every failure goes to onError.
  it('reaches every listener past ones that throw or reject, and reports each failure', async () => {
    const onError = vi.fn();
    const ends = new SessionEnds(onError);
    const after = vi.fn();
    ends.onEnd(() => {
      throw new Error('socket gone');
    });
    ends.onEnd(() => Promise.reject(new Error('feed down')));
    ends.onEnd(() => {
      // A listener's own mistake, which the kit must survive: it throws no Error object.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'not an error';
    });
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    ends.onEnd(() => Promise.reject('plain'));
    ends.onEnd(after);
    await expect(ends.end(['s1'])).resolves.toBeUndefined();
    expect(after).toHaveBeenCalledWith(['s1']);
    expect(onError.mock.calls.map(([e]) => (e as Error).message)).toEqual([
      'socket gone',
      'feed down',
      'not an error',
      'plain',
    ]);
  });
});

describe('session revocation when the game’s log fails', () => {
  it('stays settled when the game’s own error report throws or rejects', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    for (const onError of [
      () => {
        throw new Error('log down');
      },
      // Third review, finding 2: an async log that rejects.
      () => Promise.reject(new Error('log down')),
    ]) {
      const ends = new SessionEnds(onError);
      ends.onEnd(() => {
        throw new Error('socket gone');
      });
      await expect(ends.end(['s1'])).resolves.toBeUndefined();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
