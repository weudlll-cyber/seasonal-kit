/**
 * @file   src/server/totp.ts
 * @brief  Time-based one-time passwords (RFC 6238 over RFC 4226) and base32 (RFC 4648).
 *
 * Responsibility: what both games' authenticator sign-in needs, and nothing stored:
 *                 - `newSecret`: 20 random bytes; a secret under 16 bytes is refused everywhere
 *                   (RFC 4226's 128 bits): `hotp` throws, `matchingStep` matches nothing,
 *                   `base32Decode` gives null;
 *                 - `base32Encode`, `base32Decode`: the secret as the authenticator apps write it;
 *                 - `otpauthUri`: the link behind the QR code, with the game as issuer;
 *                 - `hotp`: the 6-digit code of a counter (HMAC-SHA-1, dynamic truncation), and
 *                   `stepAt`: the 30-second step of a time.
 *                 `matchingStep` finds the step a code belongs to, within one step of drift
 *                 either way. A step at or before the last one used is refused, so a code works
 *                 once: the caller stores the step it gets back. All three candidates are always
 *                 computed and compared in constant time, so the timing says nothing about
 *                 which step matched. The clock is passed in. No I/O.
 * Source:         seasonal-mini-games apps/server/src/auth/totp.ts at 866df03 (base32 decode,
 *                 all candidates compared); seasonal-bingo-royale apps/server/src/auth/totp.ts at
 *                 a43209a (`newSecret`, the issuer as a parameter, `lastStep` null before the first
 *                 use).
 * Spec:           Seasonal Entertainment docs/AUTH.md "Two-factor authentication"
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const STEP_MS = 30_000;
const DIGITS = 1_000_000;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// RFC 4226 §4 R6: at least 128 bits. A shorter key (an empty or damaged stored secret) gives
// codes anyone can compute, so it is refused everywhere (v0.8.0 pass, review 1, finding 3).
const MIN_SECRET_BYTES = 16;

function checkedSecret(secret: Uint8Array): Uint8Array {
  if (secret.length < MIN_SECRET_BYTES)
    throw new RangeError('A TOTP secret needs 16 bytes or more');
  return secret;
}

export const newSecret = (): Uint8Array => new Uint8Array(randomBytes(20));

export const stepAt = (ms: number): number => Math.floor(ms / STEP_MS);

// RFC 4226 §5.3: dynamic truncation of the HMAC of the counter, six digits.
export function hotp(secret: Uint8Array, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', checkedSecret(secret)).update(message).digest();
  // SHA-1 always gives 20 bytes: the last one picks the offset.
  const offset = mac.readUInt8(19) & 0xf;
  const value = (mac.readUInt32BE(offset) & 0x7fffffff) % DIGITS;
  return String(value).padStart(6, '0');
}

// The step `code` belongs to (now, one before or one after), later than `lastStep` (null:
// never used); null for none.
export function matchingStep(
  secret: Uint8Array,
  code: string,
  now: number,
  lastStep: number | null,
): number | null {
  // A too-short secret matches nothing (hotp would throw): sign-in fails closed.
  if (!/^\d{6}$/.test(code) || secret.length < MIN_SECRET_BYTES) return null;
  const current = stepAt(now);
  // A time that is not finite, or before the first step, matches nothing instead of throwing
  // (v0.8.0 pass, review 3, finding 4).
  if (!Number.isSafeInteger(current) || current < 1) return null;
  const sent = Buffer.from(code);
  let found: number | null = null;
  for (const step of [current - 1, current, current + 1]) {
    const same = timingSafeEqual(Buffer.from(hotp(secret, step)), sent);
    const fresh = lastStep === null || step > lastStep;
    if (same && fresh && found === null) found = step;
  }
  return found;
}

// Base32 without padding, as authenticator apps expect it.
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let out = '';
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET.charAt((buffer >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET.charAt((buffer << (5 - bits)) & 31);
  return out;
}

// Upper or lower case, with or without padding and spaces; null for another character, and
// for a secret shorter than 16 bytes (an empty text no longer decodes "successfully").
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let buffer = 0;
  const out: number[] = [];
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) return null;
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out.length < MIN_SECRET_BYTES ? null : new Uint8Array(out);
}

// Key URI format of the authenticator apps: label "issuer:account", SHA-1, 6 digits, 30 s.
export function otpauthUri(secret: Uint8Array, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  // RFC 3986 encoding ("%20"): URLSearchParams would write "+", which some apps show as is
  // (v0.8.0 pass, review 2, finding 4).
  const pairs: readonly (readonly [string, string])[] = [
    ['secret', base32Encode(secret)],
    ['issuer', issuer],
    ['algorithm', 'SHA1'],
    ['digits', '6'],
    ['period', '30'],
  ];
  const query = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `otpauth://totp/${label}?${query}`;
}
