/**
 * @file   src/server/rateLimit.ts
 * @brief  In-memory token buckets for a game's own rate limits.
 *
 * Responsibility: one limiter per kind of request, keyed by address, account or both. Each key
 *                 has `limit` tokens refilled evenly over `windowMs`; `take` answers whether a
 *                 request may pass and, if not, after how many milliseconds to retry. Lockout is
 *                 soft: a delay, never a lock. Keys idle for a whole window are forgotten every
 *                 1000 requests, so the map stays small. The clock is passed in, so tests do not
 *                 wait. The rules themselves are each game's (Mini Games allows 10 two-factor
 *                 codes in 15 minutes, Bingo 5).
 * Source:         seasonal-mini-games apps/server/src/auth/rateLimit.ts at 866df03, the same as
 *                 seasonal-bingo-royale's at a43209a; the rules stay in the games.
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
export declare class RateLimiter {
    private readonly rule;
    private readonly now;
    private readonly buckets;
    private takes;
    constructor(rule: RateRule, now?: () => number);
    take(key: string): RateDecision;
    get size(): number;
    private prune;
}
