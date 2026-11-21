/**
 * @file   src/server/rateLimit.ts
 * @brief  In-memory token buckets for a game's own rate limits.
 *
 * Responsibility: one limiter per kind of request, keyed by address, account or both. Each key
 *                 has `limit` tokens refilled evenly over `windowMs`; `take` answers whether a
 *                 request may pass and, if not, after how many milliseconds to retry. Lockout is
 *                 soft: a delay, never a lock. Keys idle for a whole window are forgotten every
 *                 1000 requests, and the map holds at most `maxKeys` (100 000): when it is full of
 *                 active keys a new key is refused, so a flood of fresh keys (IPv6 addresses; key
 *                 those by /64) cannot grow it or reset another key's bucket. A clock that went
 *                 back drains nothing. A rule must be a whole limit ≥ 1 over a finite window.
 *                 The clock is passed in, so tests do not
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

// How many keys a limiter holds at most by default; past it, idle keys go first, and a new key
// is refused while every held key is still active (review finding 5).
const MAX_KEYS = 100_000;

const validRule = (rule: RateRule, maxKeys: number): boolean =>
  Number.isSafeInteger(rule.limit) &&
  rule.limit >= 1 &&
  Number.isFinite(rule.windowMs) &&
  rule.windowMs > 0 &&
  Number.isSafeInteger(maxKeys) &&
  maxKeys >= 1;

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private takes = 0;

  constructor(
    private readonly rule: RateRule,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = MAX_KEYS,
  ) {
    if (!validRule(rule, maxKeys)) {
      throw new RangeError('A rate rule needs a whole limit ≥ 1 and a finite window');
    }
  }

  // The key's bucket, a new full one, or null when the map is full of active keys.
  private bucketOf(key: string, t: number): Bucket | null {
    const held = this.buckets.get(key);
    if (held !== undefined) return held;
    if (this.buckets.size >= this.maxKeys) this.prune(t);
    // Full of active keys: refuse the newcomer, never reset another key's bucket.
    return this.buckets.size >= this.maxKeys ? null : { tokens: this.rule.limit, updatedAt: t };
  }

  take(key: string): RateDecision {
    const t = this.now();
    // Every 1000 requests, forget keys idle for a whole window (their bucket is full again).
    if ((this.takes += 1) % 1000 === 0) this.prune(t);
    const refillPerMs = this.rule.limit / this.rule.windowMs;
    const bucket = this.bucketOf(key, t);
    if (bucket === null) return { allowed: false, retryAfterMs: this.rule.windowMs };
    // A clock that went back adds no tokens and takes none.
    const elapsed = Math.max(0, t - bucket.updatedAt);
    bucket.tokens = Math.min(this.rule.limit, bucket.tokens + elapsed * refillPerMs);
    bucket.updatedAt = Math.max(t, bucket.updatedAt);
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
