/**
 * @file   src/server/recoveryCodes.ts
 * @brief  Two-factor recovery codes: ten new ones shown once, kept only as hashes, each used
 *         once.
 *
 * Responsibility: the codes are drawn from the system's random source. `style` is the game's,
 *                 since the codes a player has already saved must still work:
 *                 - `grouped` (Mini Games): "xxxx-xxxx" from 31 letters and digits without
 *                   look-alikes (no i, l, o, 0, 1), drawn without bias, hashed as typed;
 *                 - `hex` (Bingo): 10 hex characters, hashed after spaces and dashes are taken
 *                   out and the letters lowered, so "AB12 cd-34ef" matches "ab12cd34ef".
 *                 `recoveryHash` is SHA-256 of the code in its style's form. The game stores it,
 *                 marks a code used in the same statement that finds it, and never stores or
 *                 logs a code itself. `looksLikeRecoveryCode` tells a recovery code from a
 *                 6-digit TOTP code.
 * Source:         seasonal-mini-games apps/server/src/auth/twoFactor.ts (`recoveryCode`,
 *                 `hashOf`) at 866df03; seasonal-bingo-royale apps/server/src/auth/twoFactor.ts
 *                 (`confirm`, `hashOf`) at a43209a. Their database parts stay in the games.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Two-factor authentication"
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
const COUNT = 10;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
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
export function recoveryHash(code, style) {
    return createHash('sha256').update(formOf(code, style)).digest();
}
// A recovery code has letters or a dash; a TOTP code is six digits.
export function looksLikeRecoveryCode(code) {
    return !/^\d{6}$/.test(code.trim());
}
