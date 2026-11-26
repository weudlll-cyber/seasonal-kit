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
import { type RateRuleSource } from './rateLimit.js';
export interface Attempt {
    failed(): void;
    passed(): void;
}
export declare class FailureBrake {
    private readonly now;
    private readonly maxKeys;
    private readonly slots;
    private readonly rule;
    private count;
    private fullScannedAt;
    constructor(rule: RateRuleSource, now?: () => number, maxKeys?: number);
    private hold;
    private recent;
    private forgetIdle;
    private hasRoom;
    private full;
    /** True while `limit` failures or attempts are inside the window: refuse before checking. */
    braked(key: string): boolean;
    /** One attempt for the key, holding a slot until it is ended; null while the key is braked. */
    reserve(key: string): Attempt | null;
    /** Counts one failed sign-in for the key (a success is never counted). */
    failed(key: string): void;
    get size(): number;
}
