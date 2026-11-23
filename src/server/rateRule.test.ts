/**
 * @file   src/server/rateRule.test.ts
 * @brief  The rate limiter with a rule read on every request (Bingo R3, v0.11.0).
 *
 * Responsibility: a function rule is read on every `take`, so a limit changed at runtime applies
 *                 at once: lowered, it caps the buckets now; raised, they refill toward it; a new
 *                 window counts for the refill and the forgetting. A broken rule given later, or a
 *                 function that throws, keeps the last valid rule (the limit never lifts, `take`
 *                 never throws); a broken first rule fails at construction as a fixed one does.
 * Depends on:     vitest
 * Source:         seasonal-bingo-royale apps/server/src/auth/rateLimit.ts at 5c613c0 (`liveRule`)
 */
import { describe, expect, it } from 'vitest';

import { RateLimiter, type RateRule } from './rateLimit.js';

describe('a rule read on every request', () => {
  it('applies a lowered or raised limit at once', () => {
    let rule: RateRule = { limit: 5, windowMs: 1_000 };
    let reads = 0;
    const limiter = new RateLimiter(
      () => {
        reads += 1;
        return rule;
      },
      () => 0,
    );
    expect(limiter.take('a').allowed).toBe(true);
    expect(reads).toBe(2);
    // Lowered to 2: "a" has 4 tokens left, capped at 2 now; one passes, the next waits.
    rule = { limit: 2, windowMs: 1_000 };
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
    // Raised to 10: a new key starts full at 10.
    rule = { limit: 10, windowMs: 1_000 };
    const results = Array.from({ length: 11 }, () => limiter.take('b').allowed);
    expect(results.filter(Boolean)).toHaveLength(10);
  });

  it('refills by the window it reads now', () => {
    let now = 0;
    let rule: RateRule = { limit: 1, windowMs: 1_000 };
    const limiter = new RateLimiter(
      () => rule,
      () => now,
    );
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterMs: 1_000 });
    rule = { limit: 1, windowMs: 100 };
    now = 100;
    expect(limiter.take('a').allowed).toBe(true);
  });
});

describe('a broken rule read on a request', () => {
  it('keeps the last valid rule when a later one is broken or the read throws', () => {
    let rule: RateRule = { limit: 1, windowMs: 1_000 };
    let fail = false;
    const limiter = new RateLimiter(
      () => {
        if (fail) throw new Error('settings unavailable');
        return rule;
      },
      () => 0,
    );
    expect(limiter.take('a').allowed).toBe(true);
    rule = { limit: 0, windowMs: 1_000 };
    expect(limiter.take('a').allowed).toBe(false);
    rule = { limit: 1_000_000, windowMs: Number.NaN };
    expect(limiter.take('a').allowed).toBe(false);
    fail = true;
    expect(() => limiter.take('a')).not.toThrow();
    expect(limiter.take('a').allowed).toBe(false);
  });

  it('refuses a broken first rule at construction, as a fixed one', () => {
    expect(() => new RateLimiter(() => ({ limit: 0, windowMs: 1_000 }))).toThrow(RangeError);
  });
});

describe('the rule held as a copy (v0.11.0 security pass, findings 9, 10 and 12)', () => {
  it('never reads a fixed rule again after the game changes it in place', () => {
    const rule = { limit: 1, windowMs: 60_000 };
    const limiter = new RateLimiter(rule, () => 0);
    rule.limit = Number.POSITIVE_INFINITY;
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
  });

  it('keeps the last valid copy when the source breaks the same object in place', () => {
    const settings = { rule: { limit: 1, windowMs: 60_000 } };
    const limiter = new RateLimiter(
      () => settings.rule,
      () => 0,
    );
    expect(limiter.take('a').allowed).toBe(true);
    settings.rule.windowMs = 0;
    expect(limiter.take('a').allowed).toBe(false);
    settings.rule.limit = Number.POSITIVE_INFINITY;
    expect(limiter.take('b').allowed).toBe(true);
    expect(limiter.take('b').allowed).toBe(false);
  });

  it('takes only a whole window of 1 ms or more, and no rule that is not an object', () => {
    for (const windowMs of [0.5, 1e-6, 5e-324]) {
      expect(() => new RateLimiter({ limit: 1, windowMs })).toThrow(RangeError);
    }
    expect(() => new RateLimiter(() => null as unknown as RateRule)).toThrow(RangeError);
  });
});
