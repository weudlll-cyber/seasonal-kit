/**
 * @file   src/server/recoveryCodes.test.ts
 * @brief  Recovery codes: drawn, hashed under the game's key, legacy hashes still matched.
 *
 * Responsibility:
 *                 - Both games' styles: ten, unique, in their form, hashed so that only the
 *                   right code matches, the hex style forgiving of case, spaces and dashes.
 *                 - The keyed hash is HMAC-SHA-256 under the key (D4); a legacy SHA-256 hash
 *                   still matches; both are compared in constant time; another key or a wrong
 *                   length matches nothing.
 *                 - The key: bytes from any realm, 32 or more, not one byte repeated, checked
 *                   before anything else.
 *                 Moved out of ./guards.test.ts (audit 2026-11-22: its 400-line limit).
 * Depends on:     vitest, node:crypto, node:vm
 * Source:         ./guards.test.ts at v0.9.0, moved.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Two-factor authentication"; DECISIONS K20
 */
import * as crypto from 'node:crypto';
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  looksLikeRecoveryCode,
  newRecoveryCodes,
  recoveryHash,
  recoveryLookups,
  recoveryMatches,
} from './recoveryCodes.js';

// The real functions, with randomBytes watchable so a test can force a repeated code.
vi.mock('node:crypto', async (importOriginal) => {
  const real = await importOriginal<typeof crypto>();
  return {
    ...real,
    randomBytes: vi.fn(real.randomBytes),
    timingSafeEqual: vi.fn(real.timingSafeEqual),
  };
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

  it('takes a key made in another realm (a jsdom window, a vm context)', () => {
    const foreign = runInNewContext('Uint8Array.from({ length: 32 }, (_, i) => i)') as Uint8Array;
    expect(foreign instanceof Uint8Array).toBe(false);
    expect(recoveryHash('abcd-efgh', 'grouped', foreign)).toEqual(
      recoveryHash('abcd-efgh', 'grouped', KEY),
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
