/**
 * @file   src/server/recoveryCodes.ts
 * @brief  Two-factor recovery codes: ten new ones shown once, kept only as keyed hashes, each
 *         used once.
 *
 * Responsibility: the codes are drawn from the system's random source. `style` is the game's,
 *                 since the codes a player has already saved must still work:
 *                 - `grouped` (Mini Games): "xxxx-xxxx" from 31 letters and digits without
 *                   look-alikes (no i, l, o, 0, 1), drawn without bias, hashed as typed;
 *                 - `hex` (Bingo): 10 hex characters, hashed after spaces and dashes are taken
 *                   out and the letters lowered, so "AB12 cd-34ef" matches "ab12cd34ef".
 *                 `recoveryHash` is HMAC-SHA-256 of the code in its style's form, keyed with the
 *                 game's server key (DECISIONS K20, which departs from the website's AUTH.md:
 *                 there the codes stay plain SHA-256 and work whatever the TOTP key). The key is
 *                 the game's secret: passed in, never in a repository, a byte array of at least
 *                 32 bytes that are not all the same. It is its own key, never the one that
 *                 encrypts TOTP secrets, so losing that one leaves the codes the way back in;
 *                 losing the recovery key voids the codes stored with it. A leaked database
 *                 alone gives nothing to brute-force for the keyed codes (about 40 bits each).
 *                 Codes stored before as plain SHA-256 still verify (D4): `recoveryLookups`
 *                 gives both hashes for the game's single lookup, and `recoveryMatches` checks a
 *                 stored hash in constant time against both. Until every legacy code is used or
 *                 replaced, those rows can be brute-forced from a leak, and whoever can write
 *                 the table can plant one (independent review of v0.9.0, finding 2). The game
 *                 marks a code used in the same statement that finds it, and never stores or
 *                 logs a code itself. `looksLikeRecoveryCode` tells a recovery code from a
 *                 6-digit TOTP code.
 * Source:         seasonal-mini-games apps/server/src/auth/twoFactor.ts (`recoveryCode`,
 *                 `hashOf`) at 866df03; seasonal-bingo-royale apps/server/src/auth/twoFactor.ts
 *                 (`confirm`, `hashOf`) at a43209a; the keyed hash is the owner's D4 of
 *                 2026-11-21. Their database parts stay in the games.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Two-factor authentication"; DECISIONS K20
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export type RecoveryStyle = 'grouped' | 'hex';

const COUNT = 10;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
// HMAC-SHA-256 wants a key of at least its output's length (RFC 2104 §3).
const MIN_KEY_BYTES = 32;

function grouped(): string {
  const part = (): string =>
    Array.from({ length: 4 }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('');
  return `${part()}-${part()}`;
}

// Ten distinct codes: drawn until ten differ, so a unique index on the hashes never trips
// (second review, finding 5).
export function newRecoveryCodes(style: RecoveryStyle): readonly string[] {
  const codes = new Set<string>();
  while (codes.size < COUNT) {
    codes.add(style === 'grouped' ? grouped() : randomBytes(5).toString('hex'));
  }
  return [...codes];
}

// The form a code is hashed in: as typed (grouped), or cleaned (hex).
const formOf = (code: string, style: RecoveryStyle): string =>
  style === 'grouped' ? code : code.replace(/[\s-]/g, '').toLowerCase();

// The game's key, checked: bytes (a JavaScript caller's string would carry less than it
// seems), at least 32 of them, not all the same (a zero-filled buffer is no secret).
function checkedKey(key: Uint8Array): Uint8Array {
  if (!(key instanceof Uint8Array)) throw new TypeError('A recovery key is a byte array');
  if (key.length < MIN_KEY_BYTES) throw new RangeError('A recovery key needs 32 bytes or more');
  if (key.every((byte) => byte === key[0])) {
    throw new RangeError('A recovery key cannot be one byte repeated');
  }
  return key;
}

// What a new code is stored as: HMAC-SHA-256 under the game's server key.
export function recoveryHash(code: string, style: RecoveryStyle, key: Uint8Array): Buffer {
  return createHmac('sha256', checkedKey(key)).update(formOf(code, style)).digest();
}

// The plain SHA-256 that codes were stored as before (v0.8.0 and the games today).
const legacyHash = (code: string, style: RecoveryStyle): Buffer =>
  createHash('sha256').update(formOf(code, style)).digest();

// Both hashes a typed code may be stored under, the keyed one first: the game looks for either
// in one statement (`code_hash = ANY($2)`), so legacy codes keep working until used.
export function recoveryLookups(
  code: string,
  style: RecoveryStyle,
  key: Uint8Array,
): readonly [Buffer, Buffer] {
  return [recoveryHash(code, style, key), legacyHash(code, style)];
}

// Whether `stored` is this code's keyed or legacy hash; both compared, in constant time.
export function recoveryMatches(
  code: string,
  style: RecoveryStyle,
  stored: Uint8Array,
  key: Uint8Array,
): boolean {
  // The key is checked first, so a bad key fails loudly whatever is stored.
  const [keyed, legacy] = recoveryLookups(code, style, key);
  if (stored.length !== 32) return false;
  const keyedOk = timingSafeEqual(keyed, stored);
  const legacyOk = timingSafeEqual(legacy, stored);
  return keyedOk || legacyOk;
}

// A recovery code has letters or a dash; a TOTP code is six digits.
export function looksLikeRecoveryCode(code: string): boolean {
  return !/^\d{6}$/.test(code.trim());
}
