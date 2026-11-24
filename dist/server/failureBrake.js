/**
 * @file   src/server/failureBrake.ts
 * @brief  The brake against guessing: failed sign-ins per key in a sliding window, looked at
 *         before the password is checked (since v0.15.0).
 *
 * Responsibility: `FailureBrake`: `braked(key)` looks without counting, so a route can refuse
 *                 before the password check; `failed(key)` counts one failure once the password
 *                 was wrong. A success is not counted and nothing resets on one: there is no
 *                 call for it. A key holds at most `limit` failure times, each forgotten
 *                 `windowMs` after it happened, so the (limit + 1)th try inside the window is
 *                 refused before its password is checked and the brake lifts as the oldest
 *                 failure ages out. The rate limiter (./rateLimit) takes on every call and
 *                 cannot look first; this brake counts only failures. It takes the limiter's
 *                 rule (`RateRule`, read once into a copy, a whole limit ≥ 1 over a whole window
 *                 of 1 ms or more) and its conventions:
 *                 - keys are held as given, so a game passes short, normalised keys (an account
 *                   id, an IPv6 /64 range; never a raw login name before sign-in), and the
 *                   rules and the keys themselves stay in each game;
 *                 - the map holds at most `maxKeys` (100 000); idle keys are forgotten every 1000
 *                   failures, and when it is full a scan for idle keys runs at most once a tenth
 *                   of the window; while every held key is still active a new key is refused
 *                   (`braked` answers true) and never takes another key's count (a flood of
 *                   fresh keys neither grows the map, costs a scan per request, nor lifts
 *                   another key's brake; someone who keeps 100 000 keys busy shuts out new
 *                   ones);
 *                 - a clock that went back drains nothing; one that is not finite brakes and
 *                   counts nothing;
 *                 - the clock is passed in, so tests do not wait.
 * Source:         seasonal-cases apps/server/src/auth/failureBrake.ts at 073f9ad (`FailureBrake`,
 *                 D51; its `SignInBrake` rules and keys, D55, stay in the game), with the bound
 *                 made the limiter's (Cases evicted the oldest key to make room, which lets a
 *                 flood of new keys lift an old key's brake). Reused: `ruleOf` and `RateRule` of
 *                 ./rateLimit.
 * Spec:           Seasonal Cases docs/BACKLOG.md 49; kit DECISIONS K46
 */
import { ruleOf } from './rateLimit.js';
// How many keys a brake holds at most by default, as the rate limiter's.
const MAX_KEYS = 100_000;
const RULE_ERROR = 'A failure rule needs a whole limit ≥ 1 and a whole window of 1 ms or more';
export class FailureBrake {
    now;
    maxKeys;
    failures = new Map();
    rule;
    count = 0;
    // When a full map was last scanned for idle keys (the limiter's throttle).
    fullScannedAt = Number.NEGATIVE_INFINITY;
    constructor(rule, now = Date.now, maxKeys = MAX_KEYS) {
        this.now = now;
        this.maxKeys = maxKeys;
        const copy = ruleOf(rule);
        if (copy === null || !Number.isSafeInteger(maxKeys) || maxKeys < 1) {
            throw new RangeError(RULE_ERROR);
        }
        this.rule = copy;
    }
    // The key's failures still inside the window, oldest first; the key goes when none is left.
    // A time in the future (a clock that went back) is still inside the window.
    recent(key, at) {
        const times = (this.failures.get(key) ?? []).filter((t) => at - t < this.rule.windowMs);
        if (times.length === 0)
            this.failures.delete(key);
        else
            this.failures.set(key, times);
        return times;
    }
    forgetIdle(at) {
        for (const key of [...this.failures.keys()])
            this.recent(key, at);
    }
    // Whether a key without a count can be taken in: there is room, or a scan (at most once a tenth
    // of the window) made some. Full of active keys, it cannot, and never replaces another key.
    hasRoom(at) {
        if (this.failures.size < this.maxKeys)
            return true;
        if (at - this.fullScannedAt >= this.rule.windowMs / 10) {
            this.fullScannedAt = at;
            this.forgetIdle(at);
        }
        return this.failures.size < this.maxKeys;
    }
    /** True while the key has `limit` failures inside the window: refuse before checking. */
    braked(key) {
        const at = this.now();
        if (!Number.isFinite(at))
            return true;
        if (this.recent(key, at).length >= this.rule.limit)
            return true;
        // A key with no count and no room is refused, as the limiter refuses a newcomer.
        return !this.failures.has(key) && !this.hasRoom(at);
    }
    /** Counts one failed sign-in for the key (a success is never counted). */
    failed(key) {
        const at = this.now();
        if (!Number.isFinite(at))
            return;
        // Every 1000 failures, forget keys idle for a whole window.
        if ((this.count += 1) % 1000 === 0)
            this.forgetIdle(at);
        const times = this.recent(key, at);
        if (!this.failures.has(key) && !this.hasRoom(at))
            return;
        // Only the newest `limit` matter for the brake; older ones are dropped.
        this.failures.set(key, [...times, at].slice(-this.rule.limit));
    }
    // How many keys are held (tests watch the forgetting).
    get size() {
        return this.failures.size;
    }
}
