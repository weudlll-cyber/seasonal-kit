// @vitest-environment jsdom
/**
 * @file   src/react/countdown.test.tsx
 * @brief  The server's clock: the measured offset, the countdown on it, and the start card that
 *         counts by itself (K69).
 *
 * Responsibility: the offset is the shortest round trip's, ignores samples that cannot be true
 *                 and is null without one; the seconds are rounded up and never negative; the
 *                 hook counts on the server's time even when the page's clock is a minute off,
 *                 gives null until the target and the offset are known, starts anew for a new
 *                 target and stops its timer; and a start card with `opensAt` shows nothing until
 *                 measured, then counts, and wins over `opensIn`.
 * Depends on:     vitest, @testing-library/react
 * Source:         new in the kit (K69).
 */
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clockOffset, secondsUntil } from '../serverClock.js';
import { StartCard } from './StartCard.js';
import { useCountdown } from './useCountdown.js';

describe('clockOffset', () => {
  it('takes the shortest round trip, against its middle', () => {
    const offset = clockOffset([
      { sentAt: 0, receivedAt: 400, serverTime: 9_999 },
      { sentAt: 1000, receivedAt: 1100, serverTime: 61_050 },
      { sentAt: 2000, receivedAt: 2600, serverTime: 0 },
    ]);
    expect(offset).toBe(60_000);
  });

  it('works from one answer, and ignores what cannot be true', () => {
    expect(clockOffset([{ sentAt: 100, receivedAt: 100, serverTime: 40 }])).toBe(-60);
    expect(
      clockOffset([
        { sentAt: 500, receivedAt: 400, serverTime: 1 },
        { sentAt: Number.NaN, receivedAt: 1, serverTime: 1 },
        { sentAt: 1, receivedAt: 2, serverTime: Number.POSITIVE_INFINITY },
      ]),
    ).toBeNull();
    expect(clockOffset([])).toBeNull();
  });

  it('rounds the seconds up and never goes below zero', () => {
    expect(secondsUntil(10_000, 8_999)).toBe(2);
    expect(secondsUntil(10_000, 9_000)).toBe(1);
    expect(secondsUntil(10_000, 12_000)).toBe(0);
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('useCountdown', () => {
  it("counts on the server's clock, not the page's", () => {
    // The page is a minute behind: the server's time is 160 s.
    const { result } = renderHook(() => useCountdown(170_000, 60_000));
    expect(result.current).toBe(10);
    tick(3_000);
    expect(result.current).toBe(7);
    tick(20_000);
    expect(result.current).toBe(0);
  });

  it('is null until the target and the offset are known, with no timer running', () => {
    interface Known {
      readonly at: number | null;
      readonly offset: number | null;
    }
    const nothing: Known = { at: null, offset: 0 };
    const { result, rerender } = renderHook((p: Known) => useCountdown(p.at, p.offset), {
      initialProps: nothing,
    });
    expect(result.current).toBeNull();
    rerender({ at: 105_000, offset: null });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(102_000);
    rerender({ at: 105_000, offset: 0 });
    expect(result.current).toBe(3);
  });

  it('starts anew for a new target and stops its timer when it goes', () => {
    const { result, rerender, unmount } = renderHook((at: number) => useCountdown(at, 0), {
      initialProps: 101_000,
    });
    tick(2_000);
    expect(result.current).toBe(0);
    rerender(110_000);
    expect(result.current).toBe(8);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the start card with opensAt', () => {
  it('counts by itself: nothing until measured, and over opensIn', () => {
    const card = (offsetMs: number | null) => (
      <StartCard
        game="cases"
        season={null}
        title="T"
        signature="s"
        opensIn={99}
        opensAt={{ at: 105_000, offsetMs }}
      />
    );
    const { rerender } = render(card(null));
    expect(screen.queryByTestId('countdown')).toBeNull();
    rerender(card(1_000));
    expect(screen.getByTestId('countdown').textContent).toBe('Opens in 4 s');
    tick(1_000);
    expect(screen.getByTestId('countdown').textContent).toBe('Opens in 3 s');
  });
});
