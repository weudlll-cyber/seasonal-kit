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
 *                 game's server key (DECISIONS K20). The key is the game's secret: passed in,
 *                 never in a repository, at least 32 bytes, and its own key, never the one that
 *                 encrypts TOTP secrets, so losing that one leaves the recovery codes working
 *                 (the website's AUTH.md rule). A leaked database alone then gives
 *                 nothing to brute-force: the codes carry about 40 bits, but the key does not
 *                 leak with them. Codes stored before as plain SHA-256 still verify:
 *                 `recoveryLookups` gives both hashes for the game's single lookup, and
 *                 `recoveryMatches` checks a stored hash in constant time against both. The game
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
const COUNT = 10;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
// HMAC-SHA-256 wants a key of at least its output's length (RFC 2104 §3).
const MIN_KEY_BYTES = 32;
function grouped() {
    const part = () => Array.from({ length: 4 }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('');
    return `${part()}-${part()}`;
}
// Ten distinct codes: drawn until ten differ, so a unique index on the hashes never trips
// (second review, finding 5).
export function newRecoveryCodes(style) {
    const codes = new Set();
    while (codes.size < COUNT) {
        codes.add(style === 'grouped' ? grouped() : randomBytes(5).toString('hex'));
    }
    return [...codes];
}
// The form a code is hashed in: as typed (grouped), or cleaned (hex).
const formOf = (code, style) => style === 'grouped' ? code : code.replace(/[\s-]/g, '').toLowerCase();
function checkedKey(key) {
    if (key.length < MIN_KEY_BYTES)
        throw new RangeError('A recovery key needs 32 bytes or more');
    return key;
}
// What a new code is stored as: HMAC-SHA-256 under the game's server key.
export function recoveryHash(code, style, key) {
    return createHmac('sha256', checkedKey(key)).update(formOf(code, style)).digest();
}
// The plain SHA-256 that codes were stored as before (v0.8.0 and the games today).
const legacyHash = (code, style) => createHash('sha256').update(formOf(code, style)).digest();
// Both hashes a typed code may be stored under, the keyed one first: the game looks for either
// in one statement (`code_hash = ANY($2)`), so legacy codes keep working until used.
export function recoveryLookups(code, style, key) {
    return [recoveryHash(code, style, key), legacyHash(code, style)];
}
// Whether `stored` is this code's keyed or legacy hash; both compared, in constant time.
export function recoveryMatches(code, style, stored, key) {
    if (stored.length !== 32)
        return false;
    const [keyed, legacy] = recoveryLookups(code, style, key);
    const keyedOk = timingSafeEqual(keyed, stored);
    const legacyOk = timingSafeEqual(legacy, stored);
    return keyedOk || legacyOk;
}
// A recovery code has letters or a dash; a TOTP code is six digits.
export function looksLikeRecoveryCode(code) {
    return !/^\d{6}$/.test(code.trim());
}
