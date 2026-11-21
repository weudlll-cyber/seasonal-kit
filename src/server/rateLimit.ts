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

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private takes = 0;

  constructor(
    private readonly rule: RateRule,
    private readonly now: () => number = Date.now,
  ) {
    if (!(rule.limit >= 1 && rule.windowMs > 0))
      throw new RangeError('A rate rule needs a limit ≥ 1');
  }

  take(key: string): RateDecision {
    const t = this.now();
    // Every 1000 requests, forget keys idle for a whole window (their bucket is full again).
    if ((this.takes += 1) % 1000 === 0) this.prune(t);
    const refillPerMs = this.rule.limit / this.rule.windowMs;
    const bucket = this.buckets.get(key) ?? { tokens: this.rule.limit, updatedAt: t };
    bucket.tokens = Math.min(this.rule.limit, bucket.tokens + (t - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = t;
    this.buckets.set(key, bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfterMs: 0 };
    }
    return { allowed: false, retryAfterMs: Math.ceil((1 - bucket.tokens) / refillPerMs) };
  }

  // How many keys are held (tests watch the forgetting).
  get size(): number {
    return this.buckets.size;
  }

  private prune(t: number): void {
    for (const [key, bucket] of this.buckets) {
      if (t - bucket.updatedAt >= this.rule.windowMs) this.buckets.delete(key);
    }
  }
}
