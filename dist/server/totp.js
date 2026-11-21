/**
 * @file   src/server/totp.ts
 * @brief  Time-based one-time passwords (RFC 6238 over RFC 4226) and base32 (RFC 4648).
 *
 * Responsibility: what both games' authenticator sign-in needs, and nothing stored:
 *                 - `newSecret`: 20 random bytes;
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
export const newSecret = () => new Uint8Array(randomBytes(20));
export const stepAt = (ms) => Math.floor(ms / STEP_MS);
// RFC 4226 §5.3: dynamic truncation of the HMAC of the counter, six digits.
export function hotp(secret, counter) {
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const mac = createHmac('sha1', secret).update(message).digest();
    // SHA-1 always gives 20 bytes: the last one picks the offset.
    const offset = mac.readUInt8(19) & 0xf;
    const value = (mac.readUInt32BE(offset) & 0x7fffffff) % DIGITS;
    return String(value).padStart(6, '0');
}
// The step `code` belongs to (now, one before or one after), later than `lastStep` (null:
// never used); null for none.
export function matchingStep(secret, code, now, lastStep) {
    if (!/^\d{6}$/.test(code))
        return null;
    const sent = Buffer.from(code);
    const current = stepAt(now);
    let found = null;
    for (const step of [current - 1, current, current + 1]) {
        const same = timingSafeEqual(Buffer.from(hotp(secret, step)), sent);
        const fresh = lastStep === null || step > lastStep;
        if (same && fresh && found === null)
            found = step;
    }
    return found;
}
// Base32 without padding, as authenticator apps expect it.
export function base32Encode(bytes) {
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
    if (bits > 0)
        out += ALPHABET.charAt((buffer << (5 - bits)) & 31);
    return out;
}
// Upper or lower case, with or without padding and spaces; null for another character.
export function base32Decode(text) {
    const clean = text.toUpperCase().replace(/[\s=]/g, '');
    let bits = 0;
    let buffer = 0;
    const out = [];
    for (const char of clean) {
        const value = ALPHABET.indexOf(char);
        if (value === -1)
            return null;
        buffer = ((buffer << 5) | value) & 0xffff;
        bits += 5;
        if (bits >= 8) {
            out.push((buffer >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return new Uint8Array(out);
}
// Key URI format of the authenticator apps: label "issuer:account", SHA-1, 6 digits, 30 s.
export function otpauthUri(secret, account, issuer) {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const query = new URLSearchParams({
        secret: base32Encode(secret),
        issuer,
        algorithm: 'SHA1',
        digits: '6',
        period: '30',
    });
    return `otpauth://totp/${label}?${query.toString()}`;
}
