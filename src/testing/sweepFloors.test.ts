// @vitest-environment jsdom
/**
 * @file   src/testing/sweepFloors.test.ts
 * @brief  A screen's setup runs once before it opens, and a floor of visible items is held (K115,
 *         K116).
 *
 * Responsibility: the setup runs once per screen, before the first open; a failing one is one
 *                 finding, its screen is left and the next one seen. A floor reports the look that
 *                 shows too few, with the count and the decision, holds only at its sizes and
 *                 fonts (16 px without any), may be allowed by name, and a floor that no look
 *                 checks stops the sweep. `wholeCount` counts only items wholly in the window and
 *                 inside every box around them, on a jsdom page whose boxes are given by
 *                 attributes.
 * Depends on:     vitest, jsdom
 * Source:         new in the kit.
 */
import type { Page } from '@playwright/test';
import { describe, expect, it } from 'vitest';

import { wholeCount } from './probe.js';
import { sweep, type SweepScreen } from './sweep.js';

const CLEAN = {
  hScroll: false,
  outside: [],
  cut: [],
  smallTargets: [],
  overlaps: [],
  clippedFits: [],
};

// A page that logs what happens in order and shows `rows(width)` items of any list.
function walker(rows: (width: number) => number = () => 7) {
  const log: string[] = [];
  let width = 0;
  const fake = {
    setViewportSize: (s: { width: number }) => {
      width = s.width;
      return Promise.resolve();
    },
    evaluate: (code: unknown) => {
      if (typeof code !== 'string') return Promise.resolve();
      return Promise.resolve(code.includes('return wholeItems(') ? rows(width) : CLEAN);
    },
    getByTestId: () => ({ first: () => ({ isVisible: () => Promise.resolve(false) }) }),
  };
  return { page: fake as unknown as Page, log };
}

const desktop = { width: 1280, height: 720 };
const phone = { width: 320, height: 568 };
const one = { axe: false, sizes: [desktop], fonts: [16], themes: ['light'] } as const;

describe('a screen’s setup', () => {
  const screen = (log: string[], name: string, fails = false): SweepScreen => ({
    name,
    setup: () => {
      log.push(`setup ${name}`);
      return fails ? Promise.reject(new Error('429 too many\ndetail')) : Promise.resolve();
    },
    open: () => {
      log.push(`open ${name}`);
      return Promise.resolve();
    },
  });

  it('runs once for each screen, before its looks', async () => {
    const w = walker();
    await sweep(w.page, [screen(w.log, 'a'), screen(w.log, 'b')], { ...one, fonts: [16, 32] });
    expect(w.log).toEqual(['setup a', 'open a', 'open a', 'setup b', 'open b', 'open b']);
  });

  it('that fails is one finding: its screen is left, the next one seen', async () => {
    const w = walker();
    const run = sweep(w.page, [screen(w.log, 'a', true), screen(w.log, 'b')], one);
    await expect(run).rejects.toThrow('the sweep found 1:\na: its setup failed: 429 too many');
    expect(w.log).toEqual(['setup a', 'setup b', 'open b']);
  });
});

describe('a floor of visible items', () => {
  const guesses = (more: object = {}): SweepScreen => ({
    name: 'round',
    open: () => Promise.resolve(),
    floors: [{ selector: '.guess', least: 26, decision: 'O109', sizes: [desktop], ...more }],
  });
  const both = { axe: false, sizes: [desktop, phone], themes: ['light'] } as const;

  it('reports the look that shows too few, at its sizes and at 16 px only', async () => {
    const run = sweep(walker(() => 8).page, [guesses()], both);
    await expect(run).rejects.toThrow(
      'the sweep found 1:\nround 1280x720 16px light: too few in sight: .guess: 8 of at least 26 (O109)',
    );
  });

  it('passes with enough, holds at every size and the named fonts, and may be allowed', async () => {
    await expect(sweep(walker(() => 26).page, [guesses()], both)).resolves.toBe(4);
    const every = guesses({ sizes: undefined, fonts: [16, 32] });
    await expect(sweep(walker(() => 8).page, [every], both)).rejects.toThrow(/found 4:/);
    const allowed = { ...guesses(), allow: ['too few in sight: .guess'] };
    await expect(sweep(walker(() => 8).page, [allowed], both)).resolves.toBe(4);
  });

  it('stops the sweep where no look would check it', async () => {
    const run = sweep(walker().page, [guesses()], { ...both, sizes: [phone] });
    await expect(run).rejects.toThrow('round’s floor ".guess" (O109) is checked at no look');
  });
});

describe('wholeCount', () => {
  it('counts the items wholly inside the window and every box around them', async () => {
    Element.prototype.getBoundingClientRect = function box(this: Element) {
      const [x = 0, y = 0, w = 0, h = 0] = (this.getAttribute('data-box') ?? '')
        .split(' ')
        .filter(Boolean)
        .map(Number);
      return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h } as DOMRect;
    };
    Element.prototype.checkVisibility = function visible(this: Element) {
      return !this.hasAttribute('hidden');
    };
    for (const [name, value] of [
      ['clientWidth', 400],
      ['clientHeight', 300],
    ] as const) {
      Object.defineProperty(document.documentElement, name, { configurable: true, value });
    }
    const row = (y: number, extra = '') => `<li ${extra} data-box="0 ${String(y)} 100 20"></li>`;
    document.body.innerHTML =
      // A scrolling box of 50 px: two rows whole, the third cut.
      `<ul style="overflow-y: auto" data-box="0 0 100 50">${row(0)}${row(20)}${row(40)}</ul>` +
      // Outside such a box: one whole, one across the window's bottom, one hidden.
      `<ol>${row(100)}${row(290)}${row(120, 'hidden')}</ol>`;
    const page = {
      evaluate: (code: string) => Promise.resolve((0, eval)(code) as unknown),
    } as unknown as Page;
    expect(await wholeCount(page, 'li')).toBe(3);
  });
});
