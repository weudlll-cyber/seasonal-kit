/**
 * @file   src/server/seasonFeed.ts
 * @brief  The website's season feed, read server to server: which token is in season, and the
 *         halving days.
 *
 * Responsibility: `GET https://<site>/api/public/season` (public, `max-age=60`) answers version 1
 *                 `{ v: 1, inSeason: { season, token, since }, halvingDays: [{ day, token }] }`.
 *                 `parseSeasonFeed` checks an answer strictly and keeps only the fields it knows
 *                 (a field added within version 1 is ignored; another `v` is no answer): real
 *                 dates and instants in UTC, at most 64 halving days, oldest first. The reader
 *                 never throws and keeps the last good answer when a read fails, saying why
 *                 (`lastError`) and whether that answer is older than `staleAfterMs` (`stale`).
 *                 Reads that overlap share one request, so an older answer never replaces a
 *                 newer one. The kit has no guarded fetch, so the game passes its own (`fetch`):
 *                 the one that refuses private addresses and other hosts. The reader adds what it
 *                 can hold itself: an https origin, `redirect: 'error'` and a refused redirected
 *                 answer, a timeout of its own over the whole read (also when a wrapper drops the
 *                 signal), at most 64 KiB counted in bytes as the body streams in (cancelled
 *                 past it, and on every early failure), strict UTF-8 and JSON. A game reads the
 *                 feed here, never a season handed in by the embedding page.
 * Source:         seasonal-entertainment docs/GAME-INTEGRATION.md "Season feed" (§6) and
 *                 server/src/season/routes.js (`seasonFeed`) at d4230af; its test fixture of
 *                 2026-11-22 is this file's test data. The v0.11.0 security pass's review
 *                 shaped the reading (docs/security-pass.md).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §6
 */
import { UTF8 } from './utf8.js';
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const TOKENS = SEASONS.map((s) => s.toUpperCase());
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$/;
const DAY = /^\d{4}-\d\d-\d\d$/;
// The website lists two and a half years of halvings: a handful. More is no feed of its.
const MAX_HALVINGS = 64;
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isToken = (v) => typeof v === 'string' && TOKENS.includes(v);
// A real instant: `Date.parse` rolls "02-30" over to March, so the value must come back as it
// was written (with or without its milliseconds).
function isInstant(v) {
    if (typeof v !== 'string' || !INSTANT.test(v))
        return false;
    const at = new Date(v);
    return (!Number.isNaN(at.getTime()) &&
        at.toISOString().replace(/\.000Z$/, 'Z') === v.replace(/\.000Z$/, 'Z'));
}
const isDay = (v) => typeof v === 'string' && DAY.test(v) && isInstant(`${v}T00:00:00Z`);
function inSeasonOf(v) {
    if (!isRecord(v))
        return null;
    const { season, token, since } = v;
    if (typeof season !== 'string' || !SEASONS.includes(season))
        return null;
    if (token !== season.toUpperCase() || !isToken(token) || !isInstant(since))
        return null;
    return { season: season, token, since };
}
function halvingsOf(v) {
    if (!Array.isArray(v) || v.length > MAX_HALVINGS)
        return null;
    const days = [];
    for (const h of v) {
        if (!isRecord(h) || !isDay(h['day']) || !isToken(h['token']))
            return null;
        // Oldest first: a day before the one listed last is no feed of the website's.
        const last = days.at(-1);
        if (last !== undefined && h['day'] < last.day)
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
// A failure the reader names: its message is `lastError`.
const fail = (why) => new Error(why);
// The body's bytes, counted as they stream in: past MAX_BYTES the stream is cancelled, so a
// body without a length (or with a false one) never fills the memory.
async function cappedText(response) {
    const reader = response.body?.getReader();
    if (reader === undefined)
        return '';
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
            await reader.cancel();
            throw fail('too large');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, at);
        at += chunk.byteLength;
    }
    try {
        return UTF8.decode(bytes);
    }
    catch {
        throw fail('not utf-8');
    }
}
// Why an answer is refused before its body is read, or null.
function refusal(response) {
    if (!response.ok)
        return `http ${String(response.status)}`;
    // A wrapper that followed a redirect anyway: the answer came from elsewhere.
    if (response.redirected)
        return 'redirected';
    const length = Number(response.headers.get('content-length') ?? 0);
    return length > MAX_BYTES ? 'too large' : null;
}
// The answer's JSON, or the reason it is none; an answer not read is cancelled, never left open.
async function bodyOf(response) {
    const refused = refusal(response);
    if (refused !== null) {
        await response.body?.cancel();
        throw fail(refused);
    }
    const text = await cappedText(response);
    try {
        return JSON.parse(text);
    }
    catch {
        throw fail('not json');
    }
}
const wholeMs = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new RangeError(`The season feed's ${name} must be whole milliseconds, 1 or more`);
    }
    return value;
};
// One read: the game's fetch and the body, both within `timeoutMs` by a timer of the reader's
// own, which also aborts the request.
async function readOnce(url, options, timeout) {
    const abort = new AbortController();
    let timer;
    const late = new Promise((_, reject) => {
        timer = setTimeout(() => {
            abort.abort();
            reject(fail('timeout'));
        }, timeout);
    });
    const read = (async () => {
        const response = await options.fetch(url, {
            headers: { accept: 'application/json' },
            redirect: 'error',
            signal: abort.signal,
        });
        return parseSeasonFeed(await bodyOf(response));
    })();
    try {
        return await Promise.race([read, late]);
    }
    finally {
        clearTimeout(timer);
        read.catch(() => undefined);
    }
}
export function seasonFeedReader(options) {
    const origin = new URL(options.origin);
    if (origin.protocol !== 'https:')
        throw new Error('The season feed is read over https only');
    const url = new URL('/api/public/season', origin.origin).href;
    const now = options.now ?? Date.now;
    const timeout = wholeMs(options.timeoutMs ?? 5_000, 'timeout');
    const staleAfter = wholeMs(options.staleAfterMs ?? 10 * 60_000, 'staleAfterMs');
    let good = null;
    let lastError = null;
    let pending = null;
    const state = () => ({
        feed: good?.feed ?? null,
        receivedAt: good?.at ?? null,
        // A clock that gives no finite time makes the answer stale, never fresh for good.
        stale: good === null || !(now() - good.at <= staleAfter),
        lastError,
    });
    const read = async () => {
        try {
            const feed = await readOnce(url, options, timeout);
            if (feed === null)
                throw fail('invalid');
            good = { feed, at: now() };
            lastError = null;
        }
        catch (e) {
            lastError = e instanceof Error ? e.message : 'failed';
        }
        return state();
    };
    // Reads that overlap share the one in flight.
    const refresh = () => (pending ??= read().finally(() => {
        pending = null;
    }));
    return { refresh, state };
}
