// @vitest-environment jsdom
/**
 * @file   src/testing/wholeCount.test.ts
 * @brief  An item counts as in sight only where it is whole and nothing covers it (K116, K123).
 *
 * Responsibility: `wholeCount` counts only items wholly in the window and inside every box around
 *                 them, with nothing painted over a corner or the middle and no sticky sign of a
 *                 scrolling box over them, a part that takes no pointer too, on a jsdom page whose
 *                 boxes are given by attributes; with `leading`, only the first items up to one
 *                 that is not whole.
 *                 The same in a real browser is showcase/testing.spec.ts.
 * Depends on:     vitest, jsdom
 * Source:         ./sweepFloors.test.ts, moved here (v0.40.0).
 */
import type { Page } from '@playwright/test';
import { beforeAll, describe, expect, it } from 'vitest';

import { wholeCount } from './probe.js';
import { BASE } from './probeBase.js';
import { RULES } from './probeRules.js';

// The page as jsdom can state it: boxes by attribute, painted in document order, and a scrolling
// box's sticky sign (`data-sign="<height> <bottom|top>"`) as its pseudo-element's style.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function box(this: Element) {
    const [x = 0, y = 0, w = 0, h = 0] = (this.getAttribute('data-box') ?? '')
      .split(' ')
      .filter(Boolean)
      .map(Number);
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h } as DOMRect;
  };
  Element.prototype.checkVisibility = function visible(this: Element) {
    return !this.hasAttribute('hidden') && (this as HTMLElement).style.opacity !== '0';
  };
  // As a browser's, the hit test passes through a part that takes no pointer.
  document.elementFromPoint = (x, y) =>
    [...document.querySelectorAll<HTMLElement>('[data-box]:not([hidden])')]
      .filter((el) => getComputedStyle(el).pointerEvents !== 'none')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
      })
      .at(-1) ?? null;
  const real = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el: Element, pseudo?: string | null) => {
    if (!pseudo) return real(el);
    const [height, side] = (el.getAttribute('data-sign') ?? '').split(' ');
    const shown = pseudo === '::after' && height !== '';
    return {
      content: shown ? '"More below"' : 'none',
      display: 'block',
      visibility: 'visible',
      position: 'sticky',
      height: `${height ?? ''}px`,
      boxSizing: 'border-box',
      top: side === 'top' ? '0px' : 'auto',
      bottom: side === 'top' ? 'auto' : '0px',
    } as CSSStyleDeclaration;
  };
  for (const [name, value] of [
    ['clientWidth', 400],
    ['clientHeight', 300],
  ] as const) {
    Object.defineProperty(document.documentElement, name, { configurable: true, value });
  }
});

const page = {
  evaluate: (code: string) => Promise.resolve((0, eval)(code) as unknown),
} as unknown as Page;
const row = (y: number, extra = '') => `<li ${extra} data-box="0 ${String(y)} 100 20"></li>`;
// A scrolling box 60 px high with three whole rows; `sign` is its sticky sign.
const list = (sign = ''): string =>
  `<ul style="overflow-y: auto" ${sign} data-box="0 0 100 60">${row(0)}${row(20)}${row(40)}</ul>`;
const count = (html: string): Promise<number> => {
  document.body.innerHTML = html;
  for (const box of document.querySelectorAll('ul')) {
    Object.defineProperties(box, {
      clientHeight: { configurable: true, value: 60 },
      clientTop: { configurable: true, value: 0 },
    });
  }
  // The page's copy and the module's own rule agree.
  const own = RULES.wholeItems(BASE, 'li');
  return wholeCount(page, 'li').then((seen) => {
    expect(seen).toBe(own);
    return seen;
  });
};

describe('wholeCount', () => {
  it('counts the items wholly inside the window and every box around them', async () => {
    const cut = `<ul style="overflow-y: auto" data-box="0 0 100 50">${row(0)}${row(20)}${row(40)}</ul>`;
    // Outside such a box: one whole, one across the window's bottom, one hidden.
    await expect(count(`${cut}<ol>${row(100)}${row(290)}${row(120, 'hidden')}</ol>`)).resolves.toBe(
      3,
    );
  });

  it('takes one off for a part painted over a row', async () => {
    await expect(count(list())).resolves.toBe(3);
    await expect(count(`${list()}<div data-box="0 50 100 10"></div>`)).resolves.toBe(2);
    // A part inside the row covers nothing of it.
    const inside = '<li data-box="0 80 100 20"><b data-box="0 80 100 20"></b></li>';
    await expect(count(inside)).resolves.toBe(1);
  });

  it('counts a cover that takes no pointer, and leaves its style as it was', async () => {
    const cover = '<div style="pointer-events: none; color: red" data-box="0 50 100 10"></div>';
    await expect(count(`${list()}${cover}`)).resolves.toBe(2);
    const left = document.querySelector('div')?.style;
    expect([left?.pointerEvents, left?.color]).toEqual(['none', 'red']);
    // A faded-out layer is not seen, so it covers nothing.
    await expect(count(`${list()}${cover.replace('color: red', 'opacity: 0')}`)).resolves.toBe(3);
    // One that only inherits it is given back none of its own.
    await count(`<div style="pointer-events: none"><p data-box="0 80 100 20"></p></div>${list()}`);
    expect(document.querySelector('p')?.style.pointerEvents).toBe('');
  });

  it('counts the first items up to one that is not whole, with `leading`', async () => {
    const covered = `${list()}<div data-box="0 25 100 10"></div>`;
    await expect(count(covered)).resolves.toBe(2);
    // The second row is covered: of the first rows only one is whole.
    await expect(wholeCount(page, 'li', true)).resolves.toBe(1);
    expect(RULES.wholeItems(BASE, 'li', true)).toBe(1);
    await count(`<ol>${row(0)}${row(20, 'hidden')}${row(40)}</ol>`);
    // A hidden row is not one of the list's items.
    await expect(wholeCount(page, 'li', true)).resolves.toBe(2);
  });

  it('takes a sticky sign off its scrolling box, at the bottom or the top', async () => {
    await expect(count(list('data-sign="12 bottom"'))).resolves.toBe(2);
    await expect(count(list('data-sign="30 top"'))).resolves.toBe(1);
  });
});
