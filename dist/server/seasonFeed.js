/**
 * @file   src/server/seasonFeed.ts
 * @brief  The website's season feed, read server to server: which token is in season, and the
 *         halving days.
 *
 * Responsibility: `GET https://<site>/api/public/season` (public, `max-age=60`) answers version 1
 *                 `{ v: 1, inSeason: { season, token, since }, halvingDays: [{ day, token }] }`.
 *                 `parseSeasonFeed` checks an answer strictly and keeps only the fields it knows
 *                 (a field added within version 1 is ignored; another `v` is no answer). The
 *                 reader asks for it, never throws, and keeps the last good answer when a read
 *                 fails, saying why (`lastError`) and whether that answer is older than
 *                 `staleAfterMs` (`stale`). The kit has no guarded fetch of its own, so the game
 *                 passes its own (`fetch`): the one that refuses private addresses and other
 *                 hosts. The reader adds what it can check itself: an https origin, no redirect
 *                 followed, a timeout, at most 64 KiB, JSON. A game reads the feed here, never
 *                 a season handed in by the embedding page.
 * Source:         seasonal-entertainment docs/GAME-INTEGRATION.md "Season feed" (§6) and
 *                 server/src/season/routes.js (`seasonFeed`) at d4230af; its test fixture of
 *                 2026-11-22 is this file's test data.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §6
 */
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const TOKENS = SEASONS.map((s) => s.toUpperCase());
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
const DAY = /^\d{4}-\d\d-\d\d$/;
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isToken = (v) => typeof v === 'string' && TOKENS.includes(v);
function inSeasonOf(v) {
    if (!isRecord(v))
        return null;
    const { season, token, since } = v;
    if (typeof season !== 'string' || !SEASONS.includes(season))
        return null;
    if (token !== season.toUpperCase() || !isToken(token))
        return null;
    if (typeof since !== 'string' || !INSTANT.test(since) || Number.isNaN(Date.parse(since))) {
        return null;
    }
    return { season: season, token, since };
}
function halvingsOf(v) {
    if (!Array.isArray(v))
        return null;
    const days = [];
    for (const h of v) {
        if (!isRecord(h) || typeof h['day'] !== 'string' || !DAY.test(h['day']))
            return null;
        if (!isToken(h['token']))
            return null;
        days.push({ day: h['day'], token: h['token'] });
    }
    return days;
}
// The feed as version 1 has it, only its known fields, or null for anything else.
export function parseSeasonFeed(value) {
    if (!isRecord(value) || value['v'] !== 1)
        return null;
    const inSeason = inSeasonOf(value['inSeason']);
    const halvingDays = halvingsOf(value['halvingDays']);
    return inSeason === null || halvingDays === null ? null : { v: 1, inSeason, halvingDays };
}
const MAX_BYTES = 64 * 1024;
// The answer's body as JSON, or the reason it is none.
async function bodyOf(response) {
    if (!response.ok)
        throw new Error(`http ${String(response.status)}`);
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES)
        throw new Error('too large');
    const text = await response.text();
    if (text.length > MAX_BYTES)
        throw new Error('too large');
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error('not json');
    }
}
export function seasonFeedReader(options) {
    const origin = new URL(options.origin);
    if (origin.protocol !== 'https:')
        throw new Error('The season feed is read over https only');
    const url = new URL('/api/public/season', origin.origin).href;
    const now = options.now ?? Date.now;
    const staleAfter = options.staleAfterMs ?? 10 * 60_000;
    let good = null;
    let lastError = null;
    const state = () => ({
        feed: good?.feed ?? null,
        receivedAt: good?.at ?? null,
        stale: good === null || now() - good.at > staleAfter,
        lastError,
    });
    const refresh = async () => {
        try {
            const response = await options.fetch(url, {
                headers: { accept: 'application/json' },
                redirect: 'error',
                signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
            });
            const feed = parseSeasonFeed(await bodyOf(response));
            if (feed === null)
                throw new Error('invalid');
            good = { feed, at: now() };
            lastError = null;
        }
        catch (e) {
            lastError = e instanceof Error ? e.message : 'failed';
        }
        return state();
    };
    return { refresh, state };
}
