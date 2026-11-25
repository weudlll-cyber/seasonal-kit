/**
 * @file   src/react/useCountdown.ts
 * @brief  React hook: whole seconds left until a server time, on the server's clock.
 *
 * Responsibility: `useCountdown(at, offsetMs)` gives the seconds left to `at` (a server time in
 *                 ms), measured as `Date.now() + offsetMs` (../serverClock `clockOffset`), updated
 *                 four times a second and never below 0. Null while either is unknown, so nothing
 *                 counts on the page's clock alone. A display: the server decides when a round
 *                 opens.
 * Depends on:     react, ../serverClock
 * Source:         seasonal-bingo-royale apps/web/src/useSecondsUntil.ts at 8d20904 (the interval),
 *                 with the offset seasonal-mini-games measures (apps/web/src/live/socket.ts
 *                 `serverNow`, 9e3c6f3).
 */
import { useEffect, useState } from 'react';

import { secondsUntil } from '../serverClock.js';

// Often enough that a second never shows noticeably late.
const EVERY_MS = 250;

export function useCountdown(at: number | null, offsetMs: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const counting = at !== null && offsetMs !== null;
  useEffect(() => {
    if (!counting) return undefined;
    // A new target or offset counts from this moment, not from the last tick.
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, EVERY_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [counting, at, offsetMs]);
  return at === null || offsetMs === null ? null : secondsUntil(at, now + offsetMs);
}
