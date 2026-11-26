/**
 * @file   src/server/edges.test.ts
 * @brief  The edges of the server's checks that mutation testing found unguarded: each test below
 *         fails if the line it names is changed (night audit 2026-11-25, piece 3).
 *
 * Responsibility: the limits of the steps header (a name of 40 characters, a header of 2 048
 *                 bytes, three steps, a stray character after valid base64url); the return path's
 *                 length limit and the words of its errors; TOTP at its limits (a secret of 16
 *                 bytes, the first step, a step later than the last used, base32 vectors of RFC
 *                 4648); the recovery key's checks and words; the rate limiter's rule (a window
 *                 of 1 ms, one key, an exact wait, the forgetting of idle keys) and the failure
 *                 brake's (one key, a clock that is not finite, the prune every 1000 failures,
 *                 no more than `limit` times held); trusted proxies (the prefix limits and the
 *                 mapped IPv4 form); the identity's name, subject and cut name.
 * Depends on:     vitest
 */
import { describe, expect, it, vi } from 'vitest';

import { FailureBrake } from './failureBrake.js';
import { IDENTITY_HEADERS, identityFrom } from './identity.js';
import { RateLimiter, ruleOf } from './rateLimit.js';
import { looksLikeRecoveryCode, recoveryHash } from './recoveryCodes.js';
import { safeNext, websiteLoginLocation } from './returnPath.js';
import { stepsFrom } from './steps.js';
import { base32Decode, base32Encode, hotp, matchingStep, stepAt } from './totp.js';
import { secretMatches, trustedPeers } from './trust.js';

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const STEP = { ladder: 'holder', name: 'Holder', icon: null };

describe('the steps header at its limits', () => {
  it('takes a name of 40 characters and refuses one of 41 or none', () => {
    const named = (name: string) => stepsFrom(encode([{ ...STEP, name }]), 'each');
    expect(named('a'.repeat(40)).steps).toHaveLength(1);
    expect(named('a'.repeat(41))).toEqual({ steps: [], bad: true });
    expect(named('  ')).toEqual({ steps: [], bad: true });
    expect(named('a')).toMatchObject({ bad: false });
  });

  it('refuses what is not a step, and never throws on it', () => {
    for (const item of [
      null,
      5,
      'x',
      true,
      [],
      {},
      { ...STEP, ladder: 'miner' },
      { ...STEP, ladder: 3 },
    ]) {
      expect(stepsFrom(encode([STEP, item]), 'each')).toEqual({ steps: [STEP], bad: true });
    }
  });

  it('takes three steps, refuses the fourth, and is bad past three', () => {
    const three = stepsFrom(encode([STEP, STEP, STEP]), 'all');
    expect(three).toMatchObject({ bad: false });
    expect(three.steps).toHaveLength(3);
    const four = stepsFrom(encode([STEP, STEP, STEP, STEP]), 'each');
    expect(four.steps).toHaveLength(3);
    expect(four.bad).toBe(true);
    expect(stepsFrom(encode([STEP, STEP, STEP, STEP]), 'all')).toEqual({ steps: [], bad: true });
  });

  it('takes a header of 2 048 characters and refuses one longer', () => {
    // 1 536 bytes of JSON are 2 048 base64url characters, with no padding.
    const exact = Buffer.from('[]' + ' '.repeat(1534)).toString('base64url');
    expect(exact).toHaveLength(2048);
    expect(stepsFrom(exact, 'each')).toEqual({ steps: [], bad: false });
    const longer = Buffer.from('[]' + ' '.repeat(1537)).toString('base64url');
    expect(stepsFrom(longer, 'each')).toEqual({ steps: [], bad: true });
  });

  it('refuses a header with anything but base64url in it, front, back or padding', () => {
    for (const header of ['W10!', '!W10', 'W10===', 'W10 ', 'W10\n']) {
      expect(stepsFrom(header, 'each')).toEqual({ steps: [], bad: true });
    }
    expect(stepsFrom('W10', 'each')).toEqual({ steps: [], bad: false });
    expect(stepsFrom(undefined, 'each')).toEqual({ steps: [], bad: true });
    expect(stepsFrom('', 'each')).toEqual({ steps: [], bad: true });
  });
});

describe('the return path', () => {
  const BASE = '/games/bingo/';

  it('takes a path of 512 characters and refuses one of 513', () => {
    const pad = (n: number) => BASE + 'a'.repeat(n - BASE.length);
    expect(safeNext(pad(512), BASE)).toBe(pad(512));
    expect(safeNext(pad(513), BASE)).toBe(BASE);
  });

  it('names the base path and the login path it refuses', () => {
    expect(() => safeNext('/x', 'bad')).toThrow('Not a base path: bad');
    expect(() => websiteLoginLocation('//x', BASE, '/')).toThrow('Not a path on this site: //x');
  });
});

describe('TOTP at its limits', () => {
  const secret = (n: number) => new Uint8Array(n).fill(7);

  it('works with a secret of 16 bytes and refuses 15, in words', () => {
    expect(hotp(secret(16), 1)).toMatch(/^\d{6}$/);
    expect(() => hotp(secret(15), 1)).toThrow('A TOTP secret needs 16 bytes or more');
    const code = hotp(secret(16), 5);
    expect(matchingStep(secret(16), code, 5 * 30_000, null)).toBe(5);
    expect(matchingStep(secret(15), code, 5 * 30_000, null)).toBeNull();
  });

  it('knows the first step, and a step later than the last used', () => {
    const key = secret(20);
    expect(matchingStep(key, hotp(key, 1), 30_000, null)).toBe(1);
    expect(stepAt(30_000)).toBe(1);
    expect(matchingStep(key, hotp(key, 10), 10 * 30_000, 9)).toBe(10);
    expect(matchingStep(key, hotp(key, 10), 10 * 30_000, 10)).toBeNull();
    expect(matchingStep(key, hotp(key, 9), 10 * 30_000, 8)).toBe(9);
    expect(matchingStep(key, hotp(key, 11), 10 * 30_000, 10)).toBe(11);
  });

  it('takes the step before the first as well: its code works at the first step', () => {
    // At step 1 the candidates are 0, 1 and 2; a code of step 0 is the earlier one, never used.
    const key = secret(20);
    expect(matchingStep(key, hotp(key, 0), 30_000, null)).toBe(0);
    expect(matchingStep(key, hotp(key, 0), 30_000, 0)).toBeNull();
  });

  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('base32 of "%s" is %s (RFC 4648), without padding', (plain, coded) => {
    expect(base32Encode(Buffer.from(plain))).toBe(coded);
  });

  it('decodes 16 bytes and refuses 15', () => {
    expect(base32Decode(base32Encode(secret(16)))).toEqual(secret(16));
    expect(base32Decode(base32Encode(secret(15)))).toBeNull();
  });
});

describe('the recovery key and code', () => {
  it('says what is wrong with a key, and takes one of 32 bytes', () => {
    const key = (n: number) => Uint8Array.from({ length: n }, (_, i) => i + 1);
    expect(() => recoveryHash('abcd', 'hex', 'x'.repeat(32) as never)).toThrow(
      'A recovery key is a byte array',
    );
    expect(() => recoveryHash('abcd', 'hex', key(31))).toThrow(
      'A recovery key needs 32 bytes or more',
    );
    expect(() => recoveryHash('abcd', 'hex', new Uint8Array(32).fill(9))).toThrow(
      'A recovery key cannot be one byte repeated',
    );
    expect(recoveryHash('abcd', 'hex', key(32))).toHaveLength(32);
  });

  it('takes anything but exactly six digits for a recovery code', () => {
    expect(looksLikeRecoveryCode('123456')).toBe(false);
    expect(looksLikeRecoveryCode(' 123456 ')).toBe(false);
    for (const code of ['1234567', 'abc123456', '123456abc', '12345', 'abcd-efgh']) {
      expect(looksLikeRecoveryCode(code)).toBe(true);
    }
  });
});

describe('the rate limiter and the failure brake', () => {
  it('knows what a rule is: an object with a whole limit and window, copied', () => {
    expect(ruleOf(null)).toBeNull();
    expect(ruleOf({ limit: 1, windowMs: 1 })).toEqual({ limit: 1, windowMs: 1 });
    expect(ruleOf({ limit: 0, windowMs: 1 })).toBeNull();
    expect(ruleOf({ limit: 1, windowMs: 0 })).toBeNull();
    expect(Object.isFrozen(ruleOf({ limit: 1, windowMs: 1 }))).toBe(true);
  });

  it('says what is wrong, and takes one key and a window of 1 ms', () => {
    expect(() => new RateLimiter({ limit: 0, windowMs: 1 })).toThrow(
      'A rate rule needs a whole limit',
    );
    expect(() => new FailureBrake({ limit: 0, windowMs: 1 })).toThrow(
      'A failure rule needs a whole limit',
    );
    expect(new RateLimiter({ limit: 1, windowMs: 1 }, () => 0, 1).take('a').allowed).toBe(true);
    expect(new FailureBrake({ limit: 1, windowMs: 1 }, () => 0, 1).braked('a')).toBe(false);
  });

  it('tells the wait exactly: the part of a token still missing', () => {
    const at = { now: 0 };
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, () => at.now);
    expect(limiter.take('a')).toEqual({ allowed: true, retryAfterMs: 0 });
    at.now = 400;
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterMs: 600 });
  });

  it('forgets idle keys on the 1000th request but keeps one used a moment ago', () => {
    const at = { now: 0 };
    const limiter = new RateLimiter({ limit: 1, windowMs: 100 }, () => at.now);
    for (let i = 0; i < 500; i += 1) limiter.take(`old${String(i)}`);
    at.now = 950;
    limiter.take('recent');
    at.now = 1000;
    for (let i = 0; i < 498; i += 1) limiter.take('busy');
    // 500 + 1 + 498 takes so far; the 1000th is next.
    expect(limiter.size).toBe(502);
    limiter.take('busy');
    expect(limiter.size).toBe(2);
  });

  it('forgets idle keys on the 1000th request, and not before', () => {
    const at = { now: 0 };
    const limiter = new RateLimiter({ limit: 1, windowMs: 100 }, () => at.now);
    for (let i = 0; i < 500; i += 1) limiter.take(`old${String(i)}`);
    at.now = 1000;
    for (let i = 0; i < 499; i += 1) limiter.take('busy');
    expect(limiter.size).toBe(501);
    limiter.take('busy');
    expect(limiter.size).toBe(1);
  });
});

describe('the failure brake', () => {
  it('counts nothing on a clock that is not finite, and holds no more than `limit` times', () => {
    const at = { now: 0 };
    const brake = new FailureBrake({ limit: 2, windowMs: 100 }, () => at.now);
    at.now = Number.NaN;
    brake.failed('x');
    expect(brake.size).toBe(0);
    at.now = 0;
    for (let i = 0; i < 6; i += 1) {
      at.now = i;
      brake.failed('a');
    }
    const held = (brake as unknown as { slots: Map<string, { at: number }[]> }).slots.get('a');
    expect(held).toEqual([{ at: 4 }, { at: 5 }]);
  });

  it('prunes idle keys on the 1000th failure only', () => {
    const brake = new FailureBrake({ limit: 3, windowMs: 100 }, () => 0);
    const prune = vi.spyOn(brake as unknown as { forgetIdle: () => void }, 'forgetIdle');
    for (let i = 0; i < 999; i += 1) brake.failed(`k${String(i)}`);
    expect(prune).not.toHaveBeenCalled();
    brake.failed('k999');
    expect(prune).toHaveBeenCalledTimes(1);
  });

  it('takes a newcomer while there is room, and refuses it only when the map is full', () => {
    const brake = new FailureBrake({ limit: 3, windowMs: 100 }, () => 0, 3);
    brake.failed('a');
    brake.failed('b');
    brake.failed('c');
    expect(brake.size).toBe(3);
    expect(brake.braked('d')).toBe(true);
    const roomy = new FailureBrake({ limit: 3, windowMs: 100 }, () => 0, 3);
    roomy.failed('a');
    roomy.failed('b');
    expect(roomy.braked('c')).toBe(false);
  });
});

describe('trusted proxies and secrets', () => {
  it('takes the mapped IPv4 form of a trusted address, and no other mapped text', () => {
    const trusted = trustedPeers(['172.18.0.0/16']);
    expect(trusted('172.18.0.3')).toBe(true);
    expect(trusted('::ffff:172.18.0.3')).toBe(true);
    expect(trusted('x::ffff:172.18.0.3')).toBe(false);
    expect(trusted('::ffff:172.19.0.3')).toBe(false);
    expect(trusted('::ffff:172.18.0.3.4')).toBe(false);
    expect(trusted('::ffff:abc.18.0.3')).toBe(false);
  });

  it('takes a prefix up to 32 for IPv4 and 128 for IPv6, in words', () => {
    expect(trustedPeers(['10.0.0.1/32'])('10.0.0.1')).toBe(true);
    expect(trustedPeers(['::1/128'])('::1')).toBe(true);
    expect(() => trustedPeers(['10.0.0.1/33'])).toThrow('Not a trusted proxy range: 10.0.0.1/33');
    expect(() => trustedPeers(['::1/129'])).toThrow('Not a trusted proxy range: ::1/129');
    expect(() => trustedPeers(['10.0.0.1/8/8'])).toThrow('Not a trusted proxy range: 10.0.0.1/8/8');
    expect(() => trustedPeers(['10.0.0.1/ '])).toThrow(RangeError);
    expect(trustedPeers(['uniquelocal'])('10.0.0.1')).toBe(false);
  });

  it('matches a secret exactly, never an empty one, and nothing that is not a string', () => {
    const matches = secretMatches('s3cret');
    expect(matches('s3cret')).toBe(true);
    expect(matches('')).toBe(false);
    expect(matches(['s3cret'])).toBe(false);
    expect(matches(undefined)).toBe(false);
    expect(secretMatches('')('')).toBe(false);
    expect(secretMatches('')('x')).toBe(false);
  });
});

describe('the identity', () => {
  const who = { [IDENTITY_HEADERS.id]: '7', [IDENTITY_HEADERS.name]: 'Ana' };

  it('refuses an id that only starts like one, and a name that is empty or no UTF-8', () => {
    expect(identityFrom(who, 'each')).not.toBeNull();
    for (const id of ['7e3', '0', '07', '7.5']) {
      expect(identityFrom({ ...who, [IDENTITY_HEADERS.id]: id }, 'each')).toBeNull();
    }
    expect(identityFrom({ ...who, [IDENTITY_HEADERS.name]: '' }, 'each')).toBeNull();
    const lone = 'An' + String.fromCharCode(0xfc);
    expect(identityFrom({ ...who, [IDENTITY_HEADERS.name]: lone }, 'each')).toBeNull();
    // U+0141 would be cut to its low byte, 0x41, and read as a plain "A": no header carries it.
    const cut = 'An' + String.fromCharCode(0x141);
    expect(identityFrom({ ...who, [IDENTITY_HEADERS.name]: cut }, 'each')).toBeNull();
    const wide = 'An' + String.fromCharCode(0x20ac);
    expect(identityFrom({ ...who, [IDENTITY_HEADERS.name]: wide }, 'each')).toBeNull();
  });

  it('cuts the game name to 24 characters and turns spaces into underscores', () => {
    const name = 'Walter Weudl-Administrator Extra';
    const out = identityFrom({ ...who, [IDENTITY_HEADERS.name]: name }, 'each');
    expect(out?.displayName).toBe('Walter_Weudl-Administrat');
    expect(out?.websiteName).toBe(name);
  });
});
