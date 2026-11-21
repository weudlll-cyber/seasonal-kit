/**
 * @file   src/server/totp.test.ts
 * @brief  TOTP against RFC 6238's SHA-1 vectors; the drift window; replay; constant work;
 *         base32; the otpauth link; new secrets.
 *
 * Responsibility: the six-digit codes of RFC 6238 appendix B; a code matches its own step and
 *                 one either side, never two away; a step at or before the last one used is
 *                 refused (a code works once; null: never used); a code that is no six digits
 *                 is refused before any work; all three candidates are compared every time,
 *                 whichever matches. Base32 follows RFC 4648 §10 and decodes back. The link
 *                 names the game as issuer. A new secret is 20 random bytes. Mini Games'
 *                 totp.test.ts (866df03) and Bingo's (a43209a), plus the replay with a null last
 *                 step and the constant work.
 * Depends on:     vitest, node:crypto
 * Spec:           RFC 6238 appendix B; RFC 4648 §10
 */
import * as crypto from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  base32Decode,
  base32Encode,
  hotp,
  matchingStep,
  newSecret,
  otpauthUri,
  stepAt,
} from './totp.js';

vi.mock('node:crypto', async (importOriginal) => {
  const real = await importOriginal<typeof crypto>();
  return { ...real, timingSafeEqual: vi.fn(real.timingSafeEqual) };
});

const RFC_SECRET = new TextEncoder().encode('12345678901234567890');
const NOW = 1234567890_000;

describe('TOTP (RFC 6238, SHA-1)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('at %i s gives %s', (seconds, code) => {
    expect(hotp(RFC_SECRET, stepAt(seconds * 1000))).toBe(code);
  });

  it('accepts one step of drift either way, not two', () => {
    const step = stepAt(NOW);
    for (const d of [-1, 0, 1]) {
      expect(matchingStep(RFC_SECRET, hotp(RFC_SECRET, step + d), NOW, null)).toBe(step + d);
    }
    expect(matchingStep(RFC_SECRET, hotp(RFC_SECRET, step + 2), NOW, null)).toBeNull();
    expect(matchingStep(RFC_SECRET, hotp(RFC_SECRET, step - 2), NOW, null)).toBeNull();
  });

  it('refuses a replayed code: a step at or before the last one used', () => {
    const step = stepAt(NOW);
    const code = hotp(RFC_SECRET, step);
    expect(matchingStep(RFC_SECRET, code, NOW, null)).toBe(step);
    expect(matchingStep(RFC_SECRET, code, NOW, step)).toBeNull();
    expect(matchingStep(RFC_SECRET, code, NOW, step + 1)).toBeNull();
    expect(matchingStep(RFC_SECRET, code, NOW, step - 1)).toBe(step);
    // The previous step's code after the current one was used: refused too.
    expect(matchingStep(RFC_SECRET, hotp(RFC_SECRET, step - 1), NOW, step)).toBeNull();
  });

  it.each(['', '12345', '1234567', '12a456', ' 123456', '١٢٣٤٥٦'])(
    'refuses %j before any work',
    (code) => {
      vi.mocked(crypto.timingSafeEqual).mockClear();
      expect(matchingStep(RFC_SECRET, code, NOW, null)).toBeNull();
      expect(crypto.timingSafeEqual).not.toHaveBeenCalled();
    },
  );

  it('compares all three candidates in constant time, whichever matches', () => {
    const step = stepAt(NOW);
    for (const d of [-1, 0, 1]) {
      vi.mocked(crypto.timingSafeEqual).mockClear();
      matchingStep(RFC_SECRET, hotp(RFC_SECRET, step + d), NOW, null);
      expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(3);
    }
    vi.mocked(crypto.timingSafeEqual).mockClear();
    matchingStep(RFC_SECRET, '000001', NOW, null);
    expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(3);
  });

  it('draws a new 20-byte secret each time', () => {
    const a = newSecret();
    expect(a).toHaveLength(20);
    expect(Buffer.from(a).equals(Buffer.from(newSecret()))).toBe(false);
  });
});

describe('base32 (RFC 4648)', () => {
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes %j as %s and back', (text, encoded) => {
    const bytes = new TextEncoder().encode(text);
    expect(base32Encode(bytes)).toBe(encoded);
    expect(base32Decode(encoded)).toEqual(bytes);
  });

  it('decodes lower case, padding and spaces, refuses other characters, round-trips a secret', () => {
    expect(new TextDecoder().decode(base32Decode('mzxw 6ytb oi======') ?? undefined)).toBe(
      'foobar',
    );
    expect(base32Decode('MZ1W')).toBeNull();
    const secret = newSecret();
    expect(base32Decode(base32Encode(secret))).toEqual(secret);
  });

  it('builds the otpauth link with the game as issuer and the base32 secret', () => {
    const uri = otpauthUri(RFC_SECRET, 'dev-admin', 'Seasonal Bingo Royale');
    expect(uri.startsWith('otpauth://totp/Seasonal%20Bingo%20Royale%3Adev-admin?')).toBe(true);
    const query = new URL(uri).searchParams;
    expect(query.get('secret')).toBe(base32Encode(RFC_SECRET));
    expect(query.get('issuer')).toBe('Seasonal Bingo Royale');
    expect([query.get('algorithm'), query.get('digits'), query.get('period')]).toEqual([
      'SHA1',
      '6',
      '30',
    ]);
  });
});
