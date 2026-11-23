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

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonToken = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export interface SeasonFeed {
  readonly v: 1;
  readonly inSeason: {
    readonly season: Season;
    readonly token: SeasonToken;
    readonly since: string;
  };
  // Every halving from 30 days ago to two years ahead, oldest first.
  readonly halvingDays: readonly { readonly day: string; readonly token: SeasonToken }[];
}

const SEASONS: readonly string[] = ['spring', 'summer', 'autumn', 'winter'];
const TOKENS: readonly string[] = SEASONS.map((s) => s.toUpperCase());
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
const DAY = /^\d{4}-\d\d-\d\d$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isToken = (v: unknown): v is SeasonToken => typeof v === 'string' && TOKENS.includes(v);

function inSeasonOf(v: unknown): SeasonFeed['inSeason'] | null {
  if (!isRecord(v)) return null;
  const { season, token, since } = v;
  if (typeof season !== 'string' || !SEASONS.includes(season)) return null;
  if (token !== season.toUpperCase() || !isToken(token)) return null;
  if (typeof since !== 'string' || !INSTANT.test(since) || Number.isNaN(Date.parse(since))) {
    return null;
  }
  return { season: season as Season, token, since };
}

function halvingsOf(v: unknown): SeasonFeed['halvingDays'] | null {
  if (!Array.isArray(v)) return null;
  const days: { day: string; token: SeasonToken }[] = [];
  for (const h of v) {
    if (!isRecord(h) || typeof h['day'] !== 'string' || !DAY.test(h['day'])) return null;
    if (!isToken(h['token'])) return null;
    days.push({ day: h['day'], token: h['token'] });
  }
  return days;
}

// The feed as version 1 has it, only its known fields, or null for anything else.
export function parseSeasonFeed(value: unknown): SeasonFeed | null {
  if (!isRecord(value) || value['v'] !== 1) return null;
  const inSeason = inSeasonOf(value['inSeason']);
  const halvingDays = halvingsOf(value['halvingDays']);
  return inSeason === null || halvingDays === null ? null : { v: 1, inSeason, halvingDays };
}

export interface SeasonFeedState {
  // The last good answer, or null before the first.
  readonly feed: SeasonFeed | null;
  // When it came (Unix ms), or null.
  readonly receivedAt: number | null;
  // No answer yet, or the last good one older than `staleAfterMs`.
  readonly stale: boolean;
  // Why the last read failed ("http 503", "invalid", …), or null after a good one.
  readonly lastError: string | null;
}

export interface SeasonFeedOptions {
  // The website's origin, https: the feed is `<origin>/api/public/season`.
  readonly origin: string;
  // The game's guarded fetch (public addresses only, the website's host).
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly timeoutMs?: number;
  readonly staleAfterMs?: number;
  readonly now?: () => number;
}

export interface SeasonFeedReader {
  // Reads the feed once; never throws: a failure keeps the last good answer.
  readonly refresh: () => Promise<SeasonFeedState>;
  readonly state: () => SeasonFeedState;
}

const MAX_BYTES = 64 * 1024;

// The answer's body as JSON, or the reason it is none.
async function bodyOf(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`http ${String(response.status)}`);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) throw new Error('too large');
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new Error('too large');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('not json');
  }
}

export function seasonFeedReader(options: SeasonFeedOptions): SeasonFeedReader {
  const origin = new URL(options.origin);
  if (origin.protocol !== 'https:') throw new Error('The season feed is read over https only');
  const url = new URL('/api/public/season', origin.origin).href;
  const now = options.now ?? Date.now;
  const staleAfter = options.staleAfterMs ?? 10 * 60_000;
  let good: { feed: SeasonFeed; at: number } | null = null;
  let lastError: string | null = null;
  const state = (): SeasonFeedState => ({
    feed: good?.feed ?? null,
    receivedAt: good?.at ?? null,
    stale: good === null || now() - good.at > staleAfter,
    lastError,
  });
  const refresh = async (): Promise<SeasonFeedState> => {
    try {
      const response = await options.fetch(url, {
        headers: { accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
      });
      const feed = parseSeasonFeed(await bodyOf(response));
      if (feed === null) throw new Error('invalid');
      good = { feed, at: now() };
      lastError = null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'failed';
    }
    return state();
  };
  return { refresh, state };
}
