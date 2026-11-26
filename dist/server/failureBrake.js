/**
 * @file   src/server/failureBrake.ts
 * @brief  The brake against guessing: failed sign-ins per key in a sliding window, looked at
 *         before the password is checked (since v0.15.0).
 *
 * Responsibility: `FailureBrake`: `braked(key)` looks without counting, so a route can refuse
 *                 before the password check; `failed(key)` counts one failure once the password
 *                 was wrong. A success is not counted and no failure is ever reset. Guesses sent
 *                 together would all pass `braked` before the first is counted, so a route calls
 *                 `reserve(key)` instead (since v0.33.0): null while the key is braked, else one
 *                 attempt holding a slot, which the route ends with `failed()` (the slot becomes
 *                 a failure) or `passed()` (the slot is free again); only the first of the two
 *                 counts. A key holds at most `limit` slots, failures and attempts under way
 *                 together, each forgotten `windowMs` after it happened (an attempt that is never
 *                 ended too), so the (limit + 1)th try inside the window is refused before its
 *                 password is checked and the brake lifts as the oldest slot ages out. The rate
 *                 limiter (./rateLimit) takes on every call and cannot look first; this brake
 *                 counts only failures. It takes the limiter's rule and its conventions:
 *                 - the rule (`RateRule`, a whole limit ≥ 1 over a whole window of 1 ms or more,
 *                   a fixed one read once into a copy) may be a function that gives it, read on
 *                   every check, so a limit an admin changes applies at once (since v0.33.0); a
 *                   broken rule it gives later keeps the last valid one;
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
 *                 flood of new keys lift an old key's brake); the live rule and the attempts under
 *                 way from seasonal-bingo-royale apps/server/src/auth/loginBrake.ts at 712080c
 *                 (feat/kit-0.22). Reused: `ruleReader` and `RateRuleSource` of ./rateLimit.
 * Spec:           Seasonal Cases docs/BACKLOG.md 49; kit DECISIONS K46, K92
 */
import { ruleReader } from './rateLimit.js';
// How many keys a brake holds at most by default, as the rate limiter's.
const MAX_KEYS = 100_000;
const RULE_ERROR = 'A failure rule needs a whole limit ≥ 1 and a whole window of 1 ms or more';
export class FailureBrake {
    now;
    maxKeys;
    slots = new Map();
    rule;
    count = 0;
    // When a full map was last scanned for idle keys (the limiter's throttle).
    fullScannedAt = Number.NEGATIVE_INFINITY;
    constructor(rule, now = Date.now, maxKeys = MAX_KEYS) {
        this.now = now;
        this.maxKeys = maxKeys;
        this.rule = ruleReader(rule, RULE_ERROR);
        if (!Number.isSafeInteger(maxKeys) || maxKeys < 1)
            throw new RangeError(RULE_ERROR);
    }
    // Keeps a key's slots; the key goes when none is left.
    hold(key, slots) {
        if (slots.length === 0)
            this.slots.delete(key);
        else
            this.slots.set(key, slots);
    }
    // The key's slots still inside the window, oldest first. A time in the future (a clock that
    // went back) is still inside the window.
    recent(key, at, rule) {
        const inside = (this.slots.get(key) ?? []).filter((slot) => at - slot.at < rule.windowMs);
        this.hold(key, inside);
        return inside;
    }
    forgetIdle(at, rule) {
        for (const key of [...this.slots.keys()])
            this.recent(key, at, rule);
    }
    // Whether a key without a slot can be taken in: there is room, or a scan (at most once a tenth
    // of the window) made some. Full of active keys, it cannot, and never replaces another key.
    hasRoom(at, rule) {
        if (this.slots.size < this.maxKeys)
            return true;
        if (at - this.fullScannedAt >= rule.windowMs / 10) {
            this.fullScannedAt = at;
            this.forgetIdle(at, rule);
        }
        return this.slots.size < this.maxKeys;
    }
    full(key, at, rule) {
        if (this.recent(key, at, rule).length >= rule.limit)
            return true;
        // A key with no slot and no room is refused, as the limiter refuses a newcomer.
        return !this.slots.has(key) && !this.hasRoom(at, rule);
    }
    /** True while `limit` failures or attempts are inside the window: refuse before checking. */
    braked(key) {
        const at = this.now();
        const rule = this.rule();
        return !Number.isFinite(at) || this.full(key, at, rule);
    }
    /** One attempt for the key, holding a slot until it is ended; null while the key is braked. */
    reserve(key) {
        const at = this.now();
        const rule = this.rule();
        if (!Number.isFinite(at) || this.full(key, at, rule))
            return null;
        const slot = { at };
        this.hold(key, [...this.recent(key, at, rule), slot]);
        let open = true;
        const end = (wrong) => {
            if (!open)
                return;
            open = false;
            const others = (this.slots.get(key) ?? []).filter((held) => held !== slot);
            this.hold(key, others);
            if (wrong)
                this.failed(key);
        };
        return {
            failed: () => {
                end(true);
            },
            passed: () => {
                end(false);
            },
        };
    }
    /** Counts one failed sign-in for the key (a success is never counted). */
    failed(key) {
        const at = this.now();
        if (!Number.isFinite(at))
            return;
        const rule = this.rule();
        // Every 1000 failures, forget keys idle for a whole window.
        if ((this.count += 1) % 1000 === 0)
            this.forgetIdle(at, rule);
        const inside = this.recent(key, at, rule);
        if (!this.slots.has(key) && !this.hasRoom(at, rule))
            return;
        // Only the newest `limit` matter for the brake; older ones are dropped.
        this.hold(key, [...inside, { at }].slice(-rule.limit));
    }
    // How many keys are held (tests watch the forgetting).
    get size() {
        return this.slots.size;
    }
}
