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

interface Bucket {
  tokens: number;
  updatedAt: number;
}

// How many keys a limiter holds at most by default; past it, idle keys go first, and a new key
// is refused while every held key is still active (v0.8.0 pass, review 1, finding 5).
const MAX_KEYS = 100_000;

const validRule = (rule: RateRule): boolean =>
  Number.isSafeInteger(rule.limit) &&
  rule.limit >= 1 &&
  Number.isFinite(rule.windowMs) &&
  rule.windowMs > 0;

const RULE_ERROR = 'A rate rule needs a whole limit ≥ 1 and a finite window';

// A rule, or a function that gives it: read on every request, so a limit changed at runtime (a
// game's admin area) applies at once (since v0.11.0, Bingo R3).
export type RateRuleSource = RateRule | (() => RateRule);

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private takes = 0;
  // When a full map was last scanned for idle keys: at most once a tenth of the window, so a
  // flood of new keys against a full map costs nothing per request (v0.8.0 pass, review 2, finding
  // 1).
  private fullPrunedAt = Number.NEGATIVE_INFINITY;

  // The last valid rule read: a source that gives a broken one later keeps this one.
  private rule: RateRule;

  constructor(
    private readonly source: RateRuleSource,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = MAX_KEYS,
  ) {
    const first = typeof source === 'function' ? source() : source;
    if (!validRule(first) || !Number.isSafeInteger(maxKeys) || maxKeys < 1) {
      throw new RangeError(RULE_ERROR);
    }
    this.rule = first;
  }

  // The rule for this request: the source's now, or the last valid one when it gives a broken
  // rule or throws (an admin's typo or a settings read that fails never lifts the limit nor
  // throws inside a request).
  private ruleNow(): RateRule {
    if (typeof this.source !== 'function') return this.rule;
    try {
      const read = this.source();
      if (validRule(read)) this.rule = read;
    } catch {
      // Kept: the last valid rule.
    }
    return this.rule;
  }

  // The key's bucket, a new full one, or null when the map is full of active keys.
  private bucketOf(key: string, t: number, rule: RateRule): Bucket | null {
    const held = this.buckets.get(key);
    if (held !== undefined) return held;
    if (this.buckets.size >= this.maxKeys && t - this.fullPrunedAt >= rule.windowMs / 10) {
      this.fullPrunedAt = t;
      this.prune(t, rule);
    }
    // Full of active keys: refuse the newcomer, never reset another key's bucket.
    return this.buckets.size >= this.maxKeys ? null : { tokens: rule.limit, updatedAt: t };
  }

  take(key: string): RateDecision {
    const t = this.now();
    const rule = this.ruleNow();
    // A clock that gives no finite time touches no bucket (v0.8.0 pass, review 2, finding 6).
    if (!Number.isFinite(t)) return { allowed: false, retryAfterMs: rule.windowMs };
    // Every 1000 requests, forget keys idle for a whole window (their bucket is full again).
    if ((this.takes += 1) % 1000 === 0) this.prune(t, rule);
    const refillPerMs = rule.limit / rule.windowMs;
    const bucket = this.bucketOf(key, t, rule);
    if (bucket === null) return { allowed: false, retryAfterMs: rule.windowMs };
    // A clock that went back adds no tokens and takes none.
    const elapsed = Math.max(0, t - bucket.updatedAt);
    // A lowered limit caps the bucket at once; a raised one refills toward it.
    bucket.tokens = Math.min(rule.limit, bucket.tokens + elapsed * refillPerMs);
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

  private prune(t: number, rule: RateRule): void {
    for (const [key, bucket] of this.buckets) {
      if (t - bucket.updatedAt >= rule.windowMs) this.buckets.delete(key);
    }
  }
}
