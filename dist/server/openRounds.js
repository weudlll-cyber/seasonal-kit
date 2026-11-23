/**
 * @file   src/server/openRounds.ts
 * @brief  The website's open-rounds page, built and checked once for every game.
 *
 * Responsibility: a game serves `GET <base>/api/public/open-rounds` (public, no login) and the
 *                 website reads it every 60 s. The game supplies only its data: each round's
 *                 id, title, kind, times, counts and join URL. `openRoundsPage` returns version 1
 *                 of the contract with the website's own rules applied here, so a round the
 *                 website would drop never leaves the game:
 *                 - `id` 1 to 64 characters (never cut: a cut id could name another round);
 *                 - `title` 1 to 80 and `kind` 0 to 40, cut to fit (Bingo cut its titles);
 *                 - `startsAt` and `signupClosesAt` an instant in UTC ("…Z") or null; a `Date` is
 *                   written as one;
 *                 - `players` a whole number ≥ 0, `maxPlayers` ≥ 1 or null;
 *                 - `joinUrl` absolute https on the game's public origin (the status URL's);
 *                 - a round whose sign-up closed by `now` is left out.
 *                 Lengths count UTF-16 units, as the website's `.length`. At most 20 rounds, taken
 *                 after the check, so a broken entry takes no place; unknown fields never pass.
 *                 `onDrop` hears each round left out and why, for the game's log (no data of the
 *                 round beyond its id). No player names are asked for, and none can pass.
 *                 `OPEN_ROUNDS_CACHE_CONTROL` is the header the answer carries.
 * Source:         seasonal-entertainment docs/OPEN-ROUNDS.md and
 *                 server/src/games/openRoundsContract.js at d4230af (the rules); the three
 *                 games' routes it replaces: seasonal-bingo-royale
 *                 apps/server/src/http/routes/openRounds.ts at c1bab70, seasonal-mini-games
 *                 apps/server/src/http/routes/openRounds.ts at 21434d8, seasonal-cases
 *                 apps/server/src/openRoundsRoutes.ts at cc75504.
 * Spec:           Seasonal Entertainment docs/OPEN-ROUNDS.md (version 1)
 */
const OPEN_ROUNDS_VERSION = 1;
const MAX_OPEN_ROUNDS = 20;
export const OPEN_ROUNDS_CACHE_CONTROL = 'public, max-age=30';
// The contract's lengths (UTF-16 units, as the website counts them).
const MAX_ID = 64;
const MAX_TITLE = 80;
const MAX_KIND = 40;
// `text` cut to `max` units, never through the middle of a character (an emoji is two units):
// a half left at the end is dropped too.
function cut(text, max) {
    if (text.length <= max)
        return text;
    const end = text.charCodeAt(max - 1);
    return text.slice(0, end >= 0xd800 && end <= 0xdbff ? max - 1 : max);
}
// An instant in UTC as the contract writes it, null for none, undefined for a broken one.
// A string the website reads (ends in "Z", parses) passes as the game wrote it.
function utc(value) {
    if (value === null)
        return null;
    if (typeof value === 'string') {
        return value.endsWith('Z') && !Number.isNaN(Date.parse(value)) ? value : undefined;
    }
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}
const counts = (r) => Number.isInteger(r.players) &&
    r.players >= 0 &&
    (r.maxPlayers === null || (Number.isInteger(r.maxPlayers) && r.maxPlayers >= 1));
// The join URL as the website will read it, or null when it is not https on `origin`.
function joinOn(url, origin) {
    try {
        const join = new URL(url);
        return join.protocol === 'https:' && join.origin === origin ? join.href : null;
    }
    catch {
        return null;
    }
}
// One round as the contract has it, or why the website would drop it.
function checked(r, origin, now) {
    if (r.id.trim() === '' || r.id.length > MAX_ID)
        return 'id';
    const title = cut(r.title, MAX_TITLE);
    if (title.trim() === '')
        return 'title';
    const startsAt = utc(r.startsAt);
    const signupClosesAt = utc(r.signupClosesAt);
    if (startsAt === undefined || signupClosesAt === undefined)
        return 'time';
    if (!counts(r))
        return 'count';
    const joinUrl = joinOn(r.joinUrl, origin);
    if (joinUrl === null)
        return 'joinUrl';
    if (signupClosesAt !== null && Date.parse(signupClosesAt) <= now)
        return 'closed';
    const kind = cut(r.kind, MAX_KIND);
    const { id, players, maxPlayers } = r;
    return { id, title, kind, startsAt, signupClosesAt, players, maxPlayers, joinUrl };
}
// The page for the game's rounds, in the game's order: the checked ones, at most 20.
export function openRoundsPage(rounds, options) {
    const origin = new URL(options.origin).origin;
    const now = options.now ?? Date.now();
    const kept = [];
    for (const round of rounds) {
        const result = checked(round, origin, now);
        if (typeof result === 'string')
            options.onDrop?.(round.id, result);
        else if (kept.length < MAX_OPEN_ROUNDS)
            kept.push(result);
    }
    return { version: OPEN_ROUNDS_VERSION, rounds: kept };
}
