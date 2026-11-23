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
    readonly halvingDays: readonly {
        readonly day: string;
        readonly token: SeasonToken;
    }[];
}
export declare function parseSeasonFeed(value: unknown): SeasonFeed | null;
export interface SeasonFeedState {
    readonly feed: SeasonFeed | null;
    readonly receivedAt: number | null;
    readonly stale: boolean;
    readonly lastError: string | null;
}
export interface SeasonFeedOptions {
    readonly origin: string;
    readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
    readonly timeoutMs?: number;
    readonly staleAfterMs?: number;
    readonly now?: () => number;
}
export interface SeasonFeedReader {
    readonly refresh: () => Promise<SeasonFeedState>;
    readonly state: () => SeasonFeedState;
}
export declare function seasonFeedReader(options: SeasonFeedOptions): SeasonFeedReader;
