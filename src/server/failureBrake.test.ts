/**
 * @file   src/server/failureBrake.test.ts
 * @brief  The failure brake: a route looks first, only a wrong password counts (v0.15.0).
 *
 * Responsibility: `braked` looks without counting or creating a key; `failed` counts one failure
 *                 per key, and `limit` failures inside the window brake the key, so the next try
 *                 is refused before its password is checked. The brake lifts as the oldest
 *                 failure ages out of the sliding window, keys are apart, a clock that went back
 *                 drains nothing and one that is not finite brakes and counts nothing. The map
 *                 is bounded as the rate limiter's is: idle keys are forgotten, and when it is
 *                 full of active keys a new key is refused (braked) without touching another
 *                 key's count. A broken rule or bound fails at construction, and a fixed rule is
 *                 read once into a copy; a function is read at each check. `reserve` holds a slot
 *                 for an attempt under way, so parallel guesses cannot pass the limit.
 * Depends on:     vitest
 * Source:         seasonal-cases apps/server/src/auth/failureBrake.ts at 073f9ad (D51), without
 *                 its sign-in rules and keys, which stay in the game; the bounding as
 *                 ./rateLimit.ts has it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FailureBrake } from './failureBrake.js';

const RULE = { limit: 3, windowMs: 100 };

// A brake with a clock the test moves.
function brake(rule = RULE, maxKeys?: number) {
  const clock = { now: 0 };
  const b = new FailureBrake(rule, () => clock.now, ...(maxKeys === undefined ? [] : [maxKeys]));
  return { b, clock };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('looking and counting', () => {
  it('looks without counting or holding a key', () => {
    const { b } = brake();
    for (let i = 0; i < 10; i += 1) expect(b.braked('ann')).toBe(false);
    expect(b.size).toBe(0);
  });

  it('brakes a key at `limit` failures, so the next try is refused before its password', () => {
    const { b } = brake();
    b.failed('ann');
    b.failed('ann');
    expect(b.braked('ann')).toBe(false);
    b.failed('ann');
    expect(b.braked('ann')).toBe(true);
    // Asking again counts nothing and changes nothing.
    expect(b.braked('ann')).toBe(true);
  });

  it('keeps keys apart', () => {
    const { b } = brake();
    for (let i = 0; i < 3; i += 1) b.failed('ann');
    expect(b.braked('ann')).toBe(true);
    expect(b.braked('bob')).toBe(false);
  });
});

describe('attempts under way', () => {
  it('lets exactly `limit` of many parallel wrong attempts through', async () => {
    const { b } = brake();
    let checked = 0;
    const guess = async (): Promise<void> => {
      const attempt = b.reserve('ann');
      if (attempt === null) return;
      checked += 1;
      // The password is judged later, as a hash takes its time.
      await Promise.resolve();
      attempt.failed();
    };
    await Promise.all(Array.from({ length: 20 }, guess));
    expect(checked).toBe(3);
    expect(b.braked('ann')).toBe(true);
  });

  it('counts attempts under way against the limit, also for `braked`', () => {
    const { b } = brake();
    b.failed('ann');
    expect(b.reserve('ann')).not.toBeNull();
    expect(b.reserve('ann')).not.toBeNull();
    expect(b.braked('ann')).toBe(true);
    expect(b.reserve('ann')).toBeNull();
  });

  it('frees the slot of a success, and counts a failure once', () => {
    const { b } = brake();
    for (let i = 0; i < 10; i += 1) b.reserve('ann')?.passed();
    expect(b.size).toBe(0);
    const attempt = b.reserve('ann');
    attempt?.failed();
    attempt?.failed();
    attempt?.passed();
    b.failed('ann');
    expect(b.braked('ann')).toBe(false);
    b.failed('ann');
    expect(b.braked('ann')).toBe(true);
  });
});

describe('an attempt over time', () => {
  it('dates the failure when it is judged, not when the attempt began', () => {
    const { b, clock } = brake({ limit: 1, windowMs: 100 });
    const attempt = b.reserve('ann');
    clock.now = 60;
    attempt?.failed();
    clock.now = 130;
    expect(b.braked('ann')).toBe(true);
  });

  it('lets an attempt that is never ended age out with the window', () => {
    const { b, clock } = brake({ limit: 1, windowMs: 100 });
    const lost = b.reserve('ann');
    expect(b.braked('ann')).toBe(true);
    clock.now = 100;
    expect(b.braked('ann')).toBe(false);
    // Ended late, a wrong one still counts.
    lost?.failed();
    expect(b.braked('ann')).toBe(true);
  });

  it('holds a place for the attempt in a full map, and gives none on a broken clock', () => {
    const { b, clock } = brake(RULE, 1);
    const attempt = b.reserve('ann');
    expect(b.reserve('bob')).toBeNull();
    attempt?.passed();
    expect(b.reserve('bob')).not.toBeNull();
    clock.now = Number.NaN;
    expect(b.reserve('bob')).toBeNull();
  });
});

describe('a live rule', () => {
  it('reads a function at each check, so a changed limit applies between two attempts', () => {
    const rule = { limit: 3, windowMs: 100 };
    const b = new FailureBrake(
      () => rule,
      () => 0,
    );
    b.reserve('ann')?.failed();
    expect(b.braked('ann')).toBe(false);
    rule.limit = 1;
    expect(b.reserve('ann')).toBeNull();
    rule.limit = 2;
    expect(b.reserve('ann')).not.toBeNull();
    expect(b.braked('ann')).toBe(true);
  });

  it('keeps the last valid rule when the function gives a broken one or throws', () => {
    let read = (): { limit: number; windowMs: number } => ({ limit: 1, windowMs: 100 });
    const b = new FailureBrake(
      () => read(),
      () => 0,
    );
    b.failed('ann');
    read = () => ({ limit: 0, windowMs: 100 });
    expect(b.braked('ann')).toBe(true);
    read = () => {
      throw new Error('settings unreadable');
    };
    expect(b.braked('ann')).toBe(true);
  });

  it('fails at construction when the function first gives a broken rule', () => {
    expect(() => new FailureBrake(() => ({ limit: 0, windowMs: 1 }))).toThrow(RangeError);
  });
});

describe('the sliding window', () => {
  it('lifts the brake as the oldest failure ages out, not all at once', () => {
    const { b, clock } = brake();
    b.failed('ann');
    clock.now = 10;
    b.failed('ann');
    clock.now = 20;
    b.failed('ann');
    clock.now = 99;
    expect(b.braked('ann')).toBe(true);
    // The failure at 0 is a whole window old at 100: two are left.
    clock.now = 100;
    expect(b.braked('ann')).toBe(false);
    b.failed('ann');
    expect(b.braked('ann')).toBe(true);
    clock.now = 110;
    expect(b.braked('ann')).toBe(false);
  });

  it('forgets a key once all its failures have aged out', () => {
    const { b, clock } = brake();
    b.failed('ann');
    expect(b.size).toBe(1);
    clock.now = 100;
    expect(b.braked('ann')).toBe(false);
    expect(b.size).toBe(0);
  });

  it('holds only the newest `limit` failures of a key', () => {
    const { b, clock } = brake({ limit: 2, windowMs: 100 });
    for (const at of [0, 10, 20]) {
      clock.now = at;
      b.failed('ann');
    }
    clock.now = 105;
    // The failures at 10 and 20 are inside the window: braked.
    expect(b.braked('ann')).toBe(true);
    clock.now = 110;
    expect(b.braked('ann')).toBe(false);
  });
});

describe('the clock', () => {
  it('is drained by nothing when the clock goes back, and brakes on one that is not finite', () => {
    const { b, clock } = brake();
    clock.now = 50;
    for (let i = 0; i < 3; i += 1) b.failed('ann');
    clock.now = 0;
    expect(b.braked('ann')).toBe(true);
    clock.now = Number.NaN;
    expect(b.braked('bob')).toBe(true);
    b.failed('bob');
    clock.now = 0;
    expect(b.braked('bob')).toBe(false);
    expect(b.size).toBe(1);
  });

  it('uses the system clock when none is passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const b = new FailureBrake(RULE);
    for (let i = 0; i < 3; i += 1) b.failed('ann');
    expect(b.braked('ann')).toBe(true);
    vi.setSystemTime(1_100);
    expect(b.braked('ann')).toBe(false);
  });
});

describe('the bound', () => {
  it('refuses a new key while the map is full of active keys, and touches no other count', () => {
    const { b } = brake(RULE, 2);
    b.failed('ann');
    b.failed('bob');
    b.failed('cy');
    expect(b.size).toBe(2);
    // A key the map has no room for is braked (as the rate limiter refuses a newcomer) ...
    expect(b.braked('cy')).toBe(true);
    // ... and the held keys are neither braked nor reset.
    expect(b.braked('ann')).toBe(false);
    b.failed('ann');
    b.failed('ann');
    expect(b.braked('ann')).toBe(true);
  });

  it('makes room again when the held keys have aged out', () => {
    const { b, clock } = brake(RULE, 2);
    b.failed('ann');
    b.failed('bob');
    expect(b.braked('cy')).toBe(true);
    clock.now = 100;
    expect(b.braked('cy')).toBe(false);
    b.failed('cy');
    expect(b.size).toBe(1);
  });

  it('forgets idle keys every 1000 failures, so a spread of keys does not pile up', () => {
    const { b, clock } = brake({ limit: 3, windowMs: 100 }, 100_000);
    for (let i = 0; i < 500; i += 1) b.failed(`old${String(i)}`);
    clock.now = 1_000;
    for (let i = 0; i < 500; i += 1) b.failed(`new${String(i)}`);
    expect(b.size).toBe(500);
  });

  it('scans a full map for idle keys at most once a tenth of the window', () => {
    const { b, clock } = brake({ limit: 3, windowMs: 1_000 }, 2);
    b.failed('ann');
    b.failed('bob');
    // Full of active keys: the first newcomer starts a scan, the next ones within 100 ms do not.
    expect(b.braked('cy')).toBe(true);
    const scan = vi.spyOn(b as unknown as { forgetIdle: () => void }, 'forgetIdle');
    clock.now = 50;
    for (let i = 0; i < 20; i += 1) expect(b.braked(`z${String(i)}`)).toBe(true);
    expect(scan).not.toHaveBeenCalled();
    clock.now = 100;
    expect(b.braked('z')).toBe(true);
    expect(scan).toHaveBeenCalledTimes(1);
  });
});

describe('a broken rule or bound', () => {
  it.each([
    [{ limit: 0, windowMs: 100 }],
    [{ limit: 1.5, windowMs: 100 }],
    [{ limit: 3, windowMs: 0 }],
    [{ limit: 3, windowMs: Number.NaN }],
    [null],
  ])('fails at construction: %j', (rule) => {
    expect(() => new FailureBrake(rule as never, () => 0)).toThrow(RangeError);
  });

  it('refuses a bound that is not a whole number of keys', () => {
    expect(() => new FailureBrake(RULE, () => 0, 0)).toThrow(RangeError);
    expect(() => new FailureBrake(RULE, () => 0, 1.5)).toThrow(RangeError);
  });

  it('reads the rule once into a copy of its own', () => {
    const rule = { limit: 2, windowMs: 100 };
    const { b } = brake(rule);
    rule.limit = 1_000;
    b.failed('ann');
    b.failed('ann');
    expect(b.braked('ann')).toBe(true);
  });
});
