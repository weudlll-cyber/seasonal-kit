/**
 * @file   src/clock.ts
 * @brief  The round's clock in words: "9:05" for a length of time, whole seconds down.
 *
 * Responsibility: `clockText` writes milliseconds as minutes and two-digit seconds, rounding
 *                 down, as every countdown on a round's screen does (the bar's "9:50 left", the
 *                 phase strip's "until 1:00"). A negative length is 0:00.
 * Source:         seasonal-mini-games packages/game-sdk/src/format.ts `clockText` at 866df03
 *                 (plus the floor at 0:00, which its callers did with Math.max)
 */

export function clockText(ms: number): string {
  const left = Math.max(0, ms);
  const secs = Math.floor((left % 60_000) / 1_000);
  return `${String(Math.floor(left / 60_000))}:${String(secs).padStart(2, '0')}`;
}
