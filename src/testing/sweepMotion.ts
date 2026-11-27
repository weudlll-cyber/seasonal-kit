/**
 * @file   src/testing/sweepMotion.ts
 * @brief  The testing entry's one wait for motion: a screen is judged, or pictured, when nothing
 *         that ends is still moving.
 *
 * Responsibility: `motionEnded(page)` waits until no animation or transition that ends is running
 *                 and none has started for a quiet moment (so one that begins late, after the
 *                 first look, is waited for too). One that repeats for ever, or is paused, is
 *                 left alone. After the limit it gives up and says what still moves
 *                 (`stillMoving` words it): ./sweep reports that, ./screens `settle` throws it.
 *                 One that starts after the quiet moment is not seen. The time is the test's own
 *                 (since v0.40.0), so a page whose clock is held (`page.clock.pauseAt`) is waited
 *                 for like any other: CSS animations and transitions run on the browser's own
 *                 timeline, which a held clock does not stop, while motion a script drives stands
 *                 still and counts as still.
 * Depends on:     @playwright/test (types)
 * Source:         ./sweep (`motionEnded`, v0.36.0), rewritten (v0.39.0) after Bingo Royale's
 *                 report that an animation started while the screen was judged.
 */
import type { Page } from '@playwright/test';

export const MOTION_LIMIT_MS = 5000;
// So long must nothing move before the screen counts as still.
export const MOTION_QUIET_MS = 250;

// The words for a screen that did not come to rest, in the sweep's finding and settle's error.
export const stillMoving = (moving: string): string =>
  `still moving after ${String(MOTION_LIMIT_MS / 1000)} s: ${moving}`;

// So long between two looks at the page.
const STEP_MS = 50;

// In the page: what still moves, by name; null where the page cannot list its animations. It only
// reads: no clock and no timer of the page's own, which a test may hold.
function stillRunning(): string[] | null {
  if (typeof document.getAnimations !== 'function') return null;
  const named = (a: Animation): string => {
    const part = (a.effect as { target?: Element | null } | null)?.target;
    if (part === null || part === undefined) return 'an animation';
    return [part.tagName.toLowerCase(), ...[...part.classList].slice(0, 1)].join('.');
  };
  return document
    .getAnimations()
    .filter(
      (a) =>
        (a.playState === 'running' || a.pending) &&
        a.effect?.getComputedTiming().endTime !== Infinity,
    )
    .map(named);
}

// Null when the screen is still; else what was moving when the limit was reached. The limit, the
// quiet moment and the steps are measured here, in the test's process.
export async function motionEnded(page: Page): Promise<string | null> {
  const start = Date.now();
  let calmSince = start;
  for (;;) {
    const moving = await page.evaluate(stillRunning);
    if (moving === null) return null;
    const now = Date.now();
    if (moving.length > 0) calmSince = now;
    else if (now - calmSince >= MOTION_QUIET_MS) return null;
    if (now - start >= MOTION_LIMIT_MS) {
      return moving.length > 0 ? moving.join(', ') : 'animations kept starting';
    }
    await new Promise((done) => setTimeout(done, STEP_MS));
  }
}
