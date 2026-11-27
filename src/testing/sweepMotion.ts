/**
 * @file   src/testing/sweepMotion.ts
 * @brief  The sweep's wait for motion: a screen is judged when nothing that ends is still moving.
 *
 * Responsibility: `motionEnded(page)` waits until no animation or transition that ends is running
 *                 and none has started for a quiet moment (so one that begins late, after the
 *                 first look, is waited for too). One that repeats for ever, or is paused, is
 *                 left alone. After the limit it gives up and says what still moves; the sweep
 *                 reports that. One that starts after the quiet moment is not seen.
 * Depends on:     @playwright/test (types)
 * Source:         ./sweep (`motionEnded`, v0.36.0), rewritten (v0.39.0) after Bingo Royale's
 *                 report that an animation started while the screen was judged.
 */
import type { Page } from '@playwright/test';

export const MOTION_LIMIT_MS = 5000;
// So long must nothing move before the screen counts as still.
export const MOTION_QUIET_MS = 250;

// Null when the screen is still; else what was moving when the limit was reached.
export async function motionEnded(page: Page): Promise<string | null> {
  return page.evaluate(
    async ([limit, quiet]) => {
      if (typeof document.getAnimations !== 'function') return null;
      const moving = (): Animation[] =>
        document
          .getAnimations()
          .filter(
            (a) =>
              (a.playState === 'running' || a.pending) &&
              a.effect?.getComputedTiming().endTime !== Infinity,
          );
      const named = (a: Animation): string => {
        const part = (a.effect as { target?: Element | null } | null)?.target;
        if (part === null || part === undefined) return 'an animation';
        return [part.tagName.toLowerCase(), ...[...part.classList].slice(0, 1)].join('.');
      };
      const start = Date.now();
      let calmSince = start;
      let now = moving();
      while (now.length > 0 || Date.now() - calmSince < quiet) {
        if (now.length > 0) calmSince = Date.now();
        if (Date.now() - start >= limit) {
          return now.length > 0 ? now.map(named).join(', ') : 'animations kept starting';
        }
        await new Promise((done) => setTimeout(done, 50));
        now = moving();
      }
      return null;
    },
    [MOTION_LIMIT_MS, MOTION_QUIET_MS] as const,
  );
}
