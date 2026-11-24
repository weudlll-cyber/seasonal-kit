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
import { type RateRule } from './rateLimit.js';
export declare class FailureBrake {
    private readonly now;
    private readonly maxKeys;
    private readonly failures;
    private readonly rule;
    private count;
    private fullScannedAt;
    constructor(rule: RateRule, now?: () => number, maxKeys?: number);
    private recent;
    private forgetIdle;
    private hasRoom;
    /** True while the key has `limit` failures inside the window: refuse before checking. */
    braked(key: string): boolean;
    /** Counts one failed sign-in for the key (a success is never counted). */
    failed(key: string): void;
    get size(): number;
}
