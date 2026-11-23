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
declare const OPEN_ROUNDS_VERSION = 1;
export declare const OPEN_ROUNDS_CACHE_CONTROL = "public, max-age=30";
export interface OpenRoundInput {
    readonly id: string;
    readonly title: string;
    readonly kind: string;
    readonly startsAt: Date | string | null;
    readonly signupClosesAt: Date | string | null;
    readonly players: number;
    readonly maxPlayers: number | null;
    readonly joinUrl: string;
}
export interface OpenRound {
    readonly id: string;
    readonly title: string;
    readonly kind: string;
    readonly startsAt: string | null;
    readonly signupClosesAt: string | null;
    readonly players: number;
    readonly maxPlayers: number | null;
    readonly joinUrl: string;
}
export interface OpenRoundsPage {
    readonly version: typeof OPEN_ROUNDS_VERSION;
    readonly rounds: readonly OpenRound[];
}
export type OpenRoundDrop = 'id' | 'title' | 'time' | 'count' | 'joinUrl' | 'closed';
export interface OpenRoundsOptions {
    readonly origin: string;
    readonly now?: number;
    readonly onDrop?: (id: string, why: OpenRoundDrop) => void;
}
export declare function openRoundsPage(rounds: Iterable<OpenRoundInput>, options: OpenRoundsOptions): OpenRoundsPage;
export {};
