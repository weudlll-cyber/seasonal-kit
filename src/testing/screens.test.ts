// @vitest-environment jsdom
/**
 * @file   src/testing/screens.test.ts
 * @brief  The theme switch and the screenshots of a look, against a stand-in page (K66).
 *
 * Responsibility: `setTheme` presses a visible toggle, sets the attribute where the toggle is
 *                 hidden or does not give the theme, presses nothing when the page already has it,
 *                 and waits for running animations but not for endless ones; `captureLook` takes
 *                 both sizes in both themes, scrolls the named element into view, and puts the
 *                 window size and theme back. The stand-in runs the page functions in jsdom; the
 *                 real browser is the showcase's (showcase/testing.spec.ts).
 * Depends on:     vitest, jsdom
 * Source:         new in the kit (K66).
 */
import type { Locator, Page } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLook, DESKTOP, PHONE, setTheme, SWEEP_SIZES } from './screens.js';

interface Fake {
  readonly page: Page;
  readonly shots: string[];
  readonly sizes: { width: number; height: number }[];
  clicks: number;
}

// A page whose toggle is `toggle`: visible or hidden, setting the theme it is given.
function fake(toggle: { visible: boolean; gives?: () => string }): Fake {
  const state: Fake = {
    shots: [],
    sizes: [],
    clicks: 0,
    page: {} as Page,
  };
  const page = {
    evaluate: (fn: (arg?: unknown) => unknown, arg?: unknown) => Promise.resolve(fn(arg)),
    waitForFunction: (fn: () => boolean) => {
      expect(fn()).toBe(true);
      return Promise.resolve();
    },
    getByTestId: () => ({
      first: () => ({
        isVisible: () => Promise.resolve(toggle.visible),
        click: () => {
          state.clicks += 1;
          if (toggle.gives) document.documentElement.setAttribute('data-theme', toggle.gives());
          return Promise.resolve();
        },
      }),
    }),
    viewportSize: () => ({ width: 800, height: 600 }),
    setViewportSize: (size: { width: number; height: number }) => {
      state.sizes.push(size);
      return Promise.resolve();
    },
    screenshot: ({ path }: { path: string }) => {
      state.shots.push(`${path} ${document.documentElement.getAttribute('data-theme') ?? ''}`);
      return Promise.resolve();
    },
  };
  Object.assign(state, { page: page as unknown as Page });
  return state;
}

const animations = (list: unknown[]): void => {
  Object.defineProperty(document, 'getAnimations', { value: () => list, configurable: true });
};
const theme = (): string | null => document.documentElement.getAttribute('data-theme');

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('setTheme', () => {
  it('presses a visible toggle', async () => {
    animations([]);
    const f = fake({ visible: true, gives: () => 'dark' });
    await setTheme(f.page, 'dark');
    expect(f.clicks).toBe(1);
    expect(theme()).toBe('dark');
  });

  it('sets the attribute where the toggle is hidden', async () => {
    animations([]);
    const f = fake({ visible: false });
    await setTheme(f.page, 'dark');
    expect(f.clicks).toBe(0);
    expect(theme()).toBe('dark');
  });

  it('sets the attribute when the toggle gave another theme, and presses nothing if set', async () => {
    animations([]);
    const f = fake({ visible: true, gives: () => 'system' });
    await setTheme(f.page, 'dark');
    expect(theme()).toBe('dark');
    await setTheme(f.page, 'dark');
    expect(f.clicks).toBe(1);
  });

  it('waits for running animations but not for endless ones', async () => {
    const endless = {
      playState: 'running',
      effect: { getComputedTiming: () => ({ iterations: Number.POSITIVE_INFINITY }) },
    };
    animations([endless, { playState: 'finished', effect: null }]);
    await setTheme(fake({ visible: false }).page, 'light');
    animations([{ playState: 'running', effect: null }]);
    const f = fake({ visible: false });
    const waiting = vi.fn((fn: () => boolean) => Promise.resolve(fn()));
    Object.assign(f.page, { waitForFunction: waiting });
    await setTheme(f.page, 'light');
    expect(await waiting.mock.results[0]?.value).toBe(false);
  });
});

describe('captureLook', () => {
  it('takes both sizes in both themes and puts size and theme back', async () => {
    animations([]);
    document.documentElement.setAttribute('data-theme', 'dark');
    const f = fake({ visible: false });
    const evaluate = vi.fn((fn: (el: unknown) => void) => {
      fn({ scrollIntoView: () => undefined });
      return Promise.resolve();
    });
    await captureLook(f.page, 'out', 'lobby', { evaluate } as unknown as Locator);
    expect(f.shots.map((s) => s.replaceAll('\\', '/'))).toEqual([
      'out/lobby-desktop-light.jpg light',
      'out/lobby-desktop-dark.jpg dark',
      'out/lobby-phone-light.jpg light',
      'out/lobby-phone-dark.jpg dark',
    ]);
    expect(f.sizes).toEqual([DESKTOP, PHONE, { width: 800, height: 600 }]);
    expect(theme()).toBe('dark');
    expect(evaluate).toHaveBeenCalledTimes(4);
  });

  it('works without a viewport size and without an element', async () => {
    animations([]);
    const f = fake({ visible: false });
    Object.assign(f.page, { viewportSize: () => null });
    await captureLook(f.page, 'out', 'x');
    expect(f.sizes.at(-1)).toEqual(DESKTOP);
    expect(theme()).toBe('light');
  });

  it('names the sizes of the sweep, the smallest 320x568', () => {
    expect(SWEEP_SIZES).toHaveLength(7);
    expect(SWEEP_SIZES.at(-1)).toEqual({ width: 320, height: 568 });
  });
});
