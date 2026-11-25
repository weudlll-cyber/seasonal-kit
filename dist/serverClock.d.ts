/**
 * @file   src/serverClock.ts
 * @brief  How far the visitor's clock is from the server's, measured from answers that carry the
 *         server's time; and the whole seconds left to a server time.
 *
 * Responsibility: a countdown to a moment the server announced must not trust the page's own
 *                 clock: a visitor whose clock is a minute off would see a wrong time.
 *                 `clockOffset(samples)` takes one or more exchanges (`sentAt` and `receivedAt` by
 *                 the page's clock, `serverTime` by the server's) and returns the offset of the one
 *                 with the shortest round trip, `serverTime` against the middle of it: add it to
 *                 `Date.now()` to get the server's time. One answer is enough (a rougher offset);
 *                 no usable sample gives null, never 0. `secondsUntil(at, now)` is the whole
 *                 seconds left, rounded up, never below 0.
 * Depends on:     nothing
 * Source:         seasonal-mini-games apps/web/src/live/socket.ts (`syncClock`: three round trips,
 *                 the shortest kept) at 9e3c6f3 and seasonal-bingo-royale
 *                 apps/web/src/useSecondsUntil.ts (the rounding) at 8d20904, which counts on the
 *                 page's clock (K69). Left in the games: how a server time is asked for.
 */
export interface ClockSample {
    readonly sentAt: number;
    readonly receivedAt: number;
    readonly serverTime: number;
}
export declare function clockOffset(samples: readonly ClockSample[]): number | null;
export declare function secondsUntil(at: number, now: number): number;
