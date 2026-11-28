// @vitest-environment jsdom
/**
 * @file   src/testing/screens.test.ts
 * @brief  The theme switch and the screenshots of a look, against a stand-in page (K66).
 *
 * Responsibility: `setTheme` presses a visible toggle, sets the attribute where the toggle is
 *                 hidden or does not give the theme, presses nothing when the page already has it,
 *                 waits for running animations but not for endless ones, and throws where one
 *                 never comes to rest; `captureLook` takes
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
    const start = Date.now();
    const running = (): boolean => Date.now() - start < 100;
    animations([
      { playState: 'running', effect: { getComputedTiming: () => ({ endTime: Infinity }) } },
      {
        get playState() {
          return running() ? 'running' : 'finished';
        },
        effect: null,
      },
    ]);
    await setTheme(fake({ visible: false }).page, 'light');
    expect(running()).toBe(false);
  });

  it('throws where something never comes to rest', async () => {
    let clock = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
    animations([{ playState: 'running', effect: null }]);
    await expect(setTheme(fake({ visible: false }).page, 'light')).rejects.toThrow(
      'still moving after 5 s: an animation',
    );
    vi.restoreAllMocks();
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
    expect(SWEEP_SIZES.map((s) => `${String(s.width)}x${String(s.height)}`)).toEqual([
      '1920x950',
      '1280x720',
      '1024x600',
      '390x844',
      '320x568',
    ]);
  });
});
