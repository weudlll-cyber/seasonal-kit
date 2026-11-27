/**
 * @file   src/testing/sweepMotion.ts
 * @brief  The testing entry's one wait for motion: a screen is judged, or pictured, when nothing
 *         that ends is still moving.
 *
 * Responsibility: `motionEnded(page)` waits until no animation or transition that ends is running
 *                 and none has started for a quiet moment (so one that begins late, after the
 *                 first look, is waited for too). One that repeats for ever, or is paused, is
 *                 left alone, and so is what a game declares (`IntendedMotion`, since v0.40.0: a
 *                 selector and the owner's decision with its number; one without is refused).
 *                 After the limit it gives up and says what still moves
 *                 (`stillMoving` words it): ./sweep reports that, ./screens `settle` throws it.
 *                 One that starts after the quiet moment is not seen. The time is the test's own
 *                 (since v0.40.0), so a page whose clock is held (`page.clock.pauseAt`) is waited
 *                 for like any other: CSS animations and transitions run on the browser's own
 *                 timeline, which a held clock does not stop, while motion a script drives stands
 *                 still and counts as still.
 * Depends on:     ./decision; @playwright/test (types)
 * Source:         ./sweep (`motionEnded`, v0.36.0), rewritten (v0.39.0) after Bingo Royale's
 *                 report that an animation started while the screen was judged.
 */
import type { Page } from '@playwright/test';
export declare const MOTION_LIMIT_MS = 5000;
export declare const MOTION_QUIET_MS = 250;
export declare const stillMoving: (moving: string) => string;
export interface IntendedMotion {
    readonly selector: string;
    readonly decision: string;
}
export declare function motionEnded(page: Page, meant?: readonly IntendedMotion[]): Promise<string | null>;
