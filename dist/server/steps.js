/**
 * @file   src/server/steps.ts
 * @brief  A member's Discord steps from the website's X-Acting-User-Steps header, checked.
 *
 * Responsibility: the header is base64url of compact JSON: an array of at most three
 *                 `{ ladder, name, icon }`. Each step is checked by the stricter rule of both
 *                 games:
 *                 - exactly those three keys;
 *                 - a known ladder (holder, farmer, investor);
 *                 - a name of 1 to 40 characters after trimming;
 *                 - an icon that is null or exactly the contract's public file,
 *                   "/media/step-icons/<32 hex>.webp" (stricter than both games, after the
 *                   second independent review: no other route of the site can be named).
 *                 A header over 2 KB, or that is no base64url of a JSON array, gives no steps.
 *                 `mode` is the game's: `each` keeps the steps that hold, at most three (Mini
 *                 Games), `all` gives none when one fails or there are more than three (Bingo).
 *                 `bad` says that the header was missing, or there but not a valid list, for a
 *                 log line: the contract requires it, `[]` for a member without steps.
 *                 Steps never grant rights; only the website's role headers do.
 * Source:         seasonal-mini-games apps/server/src/auth/websiteIdentity.ts (`stepsFrom`) and
 *                 packages/contracts/src/http/session.ts (`PlayerStep`) at 866df03;
 *                 seasonal-bingo-royale packages/contracts/src/http/steps.ts (`parseSteps`) at
 *                 a43209a. No zod: the kit has no runtime dependency. The decoder is ./utf8's,
 *                 shared with ./identity (since v0.10.1).
 * Spec:           Seasonal Entertainment docs/AUTH.md "Embedded games"; GAME-INTEGRATION.md §2
 */
import { UTF8 } from './utf8.js';
const LADDERS = ['holder', 'farmer', 'investor'];
const MAX_STEPS = 3;
const MAX_HEADER = 2_048;
// The contract's icon, exactly: "/media/step-icons/<32 hex>.webp" (v0.8.0 pass, review 2, finding
// 3).
const ICON = /^\/media\/step-icons\/[0-9a-f]{32}\.webp$/;
const KEYS = ['icon', 'ladder', 'name'];
// The step's name trimmed, 1 to 40 characters, or null.
function nameOf(name) {
    if (typeof name !== 'string')
        return null;
    const trimmed = name.trim();
    return trimmed.length >= 1 && trimmed.length <= 40 ? trimmed : null;
}
function stepOf(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return null;
    const v = value;
    if (Object.keys(v).sort().join() !== KEYS.join())
        return null;
    const { ladder, icon } = v;
    const name = nameOf(v['name']);
    if (typeof ladder !== 'string' || !LADDERS.includes(ladder) || name === null)
        return null;
    if (icon !== null && (typeof icon !== 'string' || !ICON.test(icon)))
        return null;
    return { ladder: ladder, name, icon };
}
// The JSON array in the header, or null for anything else.
function arrayIn(header) {
    if (header.length > MAX_HEADER || !/^[A-Za-z0-9_-]*={0,2}$/.test(header))
        return null;
    try {
        const text = UTF8.decode(Buffer.from(header, 'base64url'));
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
export function stepsFrom(header, mode) {
    // The contract requires the header ("[]" without steps): missing or empty is marked bad,
    // for the game's log, and still gives no steps (v0.8.0 pass, review 1, finding 6).
    if (header === undefined || header === '')
        return { steps: [], bad: true };
    const list = arrayIn(header);
    if (list === null)
        return { steps: [], bad: true };
    const checked = list.map(stepOf);
    const steps = checked.flatMap((s) => (s === null ? [] : [s]));
    const bad = steps.length !== list.length || list.length > MAX_STEPS;
    if (mode === 'all' && bad)
        return { steps: [], bad };
    return { steps: steps.slice(0, MAX_STEPS), bad };
}
