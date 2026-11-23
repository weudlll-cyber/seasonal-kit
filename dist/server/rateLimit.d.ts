/**
 * @file   src/server/rateLimit.ts
 * @brief  In-memory token buckets for a game's own rate limits.
 *
 * Responsibility: one limiter per kind of request, keyed by address, account or both. Each key
 *                 has `limit` tokens refilled evenly over `windowMs`; `take` answers whether a
 *                 request may pass and, if not, after how many milliseconds to retry. Lockout is
 *                 soft: a delay, never a lock. Keys idle for a whole window are forgotten every
 *                 1000 requests, and the map holds at most `maxKeys` (100 000). When it is full,
 *                 it is scanned for idle keys at most once a tenth of the window; between scans,
 *                 and while every held key is active, a new key is refused at once, without a
 *                 scan. A flood of fresh keys therefore neither grows the map, nor costs a scan
 *                 per request, nor resets another key's bucket. The trade-off: someone who keeps
 *                 100 000 keys busy shuts out new ones. Games key by account and by IPv6 /64
 *                 (never a whole address), which makes that cost one address range per key. A
 *                 clock that went back drains nothing; a time that is not finite touches
 *                 nothing. A rule must be a whole limit ≥ 1 over a finite window. It may be a
 *                 function that gives the rule, read on every request, so a limit a game's admin
 *                 changes applies at once (since v0.11.0, Bingo R3); a broken rule it gives later
 *                 keeps the last valid one, never lifting the limit or throwing. The clock is
 *                 passed in, so tests do not wait. The rules themselves are each game's (Mini
 *                 Games allows 10 two-factor codes in 15 minutes, Bingo 5).
 * Source:         seasonal-mini-games apps/server/src/auth/rateLimit.ts at 866df03, the same as
 *                 seasonal-bingo-royale's at a43209a; the rule read per request from Bingo's at
 *                 5c613c0 (feat/kit-adoption); the rules stay in the games.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2; the games' 03 §13
 */
export interface RateRule {
    readonly limit: number;
    readonly windowMs: number;
}
export interface RateDecision {
    readonly allowed: boolean;
    readonly retryAfterMs: number;
}
export type RateRuleSource = RateRule | (() => RateRule);
export declare class RateLimiter {
    private readonly source;
    private readonly now;
    private readonly maxKeys;
    private readonly buckets;
    private takes;
    private fullPrunedAt;
    private rule;
    constructor(source: RateRuleSource, now?: () => number, maxKeys?: number);
    private ruleNow;
    private bucketOf;
    take(key: string): RateDecision;
    get size(): number;
    private prune;
}
