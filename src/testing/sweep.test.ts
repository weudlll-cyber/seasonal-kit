// @vitest-environment jsdom
/**
 * @file   src/testing/sweep.test.ts
 * @brief  The sweep walks every look and fails with every finding; the probe's rules on a page
 *         whose layout is stated (K66).
 *
 * Responsibility: `sweep` opens each screen once per size, font and theme with that window, font
 *                 and theme set, reports probe and axe findings with their place, leaves out what
 *                 a screen allows, throws when there is nothing to see and counts the looks it
 *                 saw; `axeFinder` runs the WCAG tags and names rule and targets; and each rule of
 *                 `probe` on a jsdom page whose boxes are given by attributes (jsdom lays nothing
 *                 out): sideways scroll, a box past the window, cut and ellipsed text, a small
 *                 control with its two exceptions, a clipped fitted root, and nothing for hidden
 *                 elements. The same probe on real layout is showcase/testing.spec.ts.
 * Depends on:     vitest, jsdom
 * Source:         new in the kit (K66).
 */
import type { Page } from '@playwright/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { probe, runProbe, type Probe } from './probe.js';
import { axeFinder, sweep } from './sweep.js';

// `data-box="left top width height"` is an element's layout; without it, 100x50 at the origin.
const boxOf = (el: Element): DOMRect => {
  const [x = 0, y = 0, w = 100, h = 50] = (el.getAttribute('data-box') ?? '')
    .split(' ')
    .filter(Boolean)
    .map(Number);
  return {
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
  } as DOMRect;
};
const size = (el: Element, name: string): number => Number(el.getAttribute(`data-${name}`) ?? 100);

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function box(this: Element) {
    return boxOf(this);
  };
  Element.prototype.checkVisibility = function visible(this: Element) {
    return !this.hasAttribute('hidden');
  };
  Range.prototype.getClientRects = function rects(this: Range) {
    const holder = this.startContainer as Element;
    const text = holder.nodeType === Node.TEXT_NODE ? holder.parentElement : holder;
    const at = text?.getAttribute('data-text') ?? text?.getAttribute('data-box') ?? '0 0 80 20';
    const el = document.createElement('i');
    el.setAttribute('data-box', at);
    return [boxOf(el)] as unknown as DOMRectList;
  };
  for (const name of ['scrollWidth', 'scrollHeight', 'clientWidth', 'clientHeight']) {
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      get(this: Element) {
        if (this === document.documentElement && name === 'clientHeight') return 1000;
        return this === document.documentElement && name === 'clientWidth'
          ? size(this, 'clientwidth') * 4
          : size(this, name.toLowerCase());
      },
    });
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-scrollwidth');
});

// The measurement on the jsdom page, called as the module's own function.
const look = (html: string): Probe => {
  document.body.innerHTML = html;
  return runProbe(44);
};

describe('probe', () => {
  it('puts its functions into the page as source and runs them there', async () => {
    // The page's `evaluate` runs the injected source in jsdom, as a browser would.
    const page = {
      evaluate: (code: string) => Promise.resolve((0, eval)(code) as unknown),
    } as unknown as Page;
    document.body.innerHTML = '<button data-box="0 0 20 20">x</button>';
    expect((await probe(page)).smallTargets).toEqual(['button "x" 20x20']);
    expect((await probe(page, 20)).smallTargets).toEqual([]);
  });

  it('finds nothing on a page that fits', () => {
    const seen = look(
      '<button data-box="0 0 44 44">Go</button><p data-box="0 50 100 20">words</p>',
    );
    expect(seen).toEqual({
      hScroll: false,
      outside: [],
      cut: [],
      smallTargets: [],
      overlaps: [],
      clippedFits: [],
    });
  });

  it('reports sideways scroll and the outermost box past the window', () => {
    document.documentElement.setAttribute('data-scrollwidth', '900');
    const seen = look(
      '<div class="wide" data-box="0 0 500 20"><span data-box="0 0 490 20">x</span></div>' +
        '<div style="overflow-x: auto" data-box="0 0 90 20"><b data-box="0 0 600 20">y</b></div>',
    );
    expect(seen.hScroll).toBe(true);
    expect(seen.outside).toEqual(['div.wide "x" 0..500']);
  });

  it('reports text a hidden box cuts, and text an ellipsis hides', () => {
    const seen = look(
      '<div style="overflow: hidden" data-box="0 0 40 20"><span data-testid="a" data-text="0 0 80 20">long words</span></div>' +
        '<div style="text-overflow: ellipsis" data-scrollwidth="300">dots</div>' +
        '<div style="overflow: auto" data-box="0 0 40 20"><span data-text="0 0 80 20">scrolls</span></div>',
    );
    expect(seen.cut).toEqual(['[a] span "long words"', 'div "dots"']);
  });
});

describe('probe on controls and fitted roots', () => {
  it('reports a control under 44 px, but no link in text and no labelled box', () => {
    const seen = look(
      '<button data-box="0 0 44 43">a</button>' +
        '<p>read <a href="#x" style="display: inline" data-box="0 0 30 16">this</a> now</p>' +
        '<p><a href="#y" style="display: inline" data-box="0 0 30 16">alone</a></p>' +
        '<label data-box="0 0 200 44"><input type="checkbox" data-box="0 0 13 13">yes</label>' +
        '<input type="radio" data-box="0 0 13 13">' +
        '<button hidden data-box="0 0 5 5">gone</button>' +
        '<span role="button" data-box="0 0 1 1">sr</span>',
    );
    expect(seen.smallTargets).toEqual(['button "a" 44x43', 'a "alone" 30x16', 'input 13x13']);
  });

  it('reports a fitted root that cuts a part: one past its padding box, on any side', () => {
    const root = (part: string): string =>
      `<section data-sk-fit-scale="1" data-box="0 0 100 100">${part}</section>`;
    const seen = look(
      root('<b class="low" data-box="0 60 90 60">a</b>') +
        root('<b class="fits" data-box="0 0 100 100">b</b>') +
        root('<b class="left" data-box="-9 0 50 20">c</b>') +
        root('<i data-box="0 0 90 20" data-text="0 0 160 20">long</i>') +
        root(
          '<div style="overflow: auto" data-box="0 0 90 90"><b data-box="0 0 90 400">d</b></div>',
        ) +
        root('<b hidden data-box="0 0 500 500">e</b>'),
    );
    expect(seen.clippedFits.map((f) => f.replace(/^section "[^"]*" /, ''))).toEqual([
      'cuts b.low "a"',
      'cuts b.left "c"',
      'cuts i "long"',
    ]);
  });
});

// A page that records what the sweep did to it and answers the probe with `seen`.
function walker(seen: Partial<Probe> = {}) {
  const log: string[] = [];
  let viewport = '';
  const clean: Probe = {
    hScroll: false,
    outside: [],
    cut: [],
    smallTargets: [],
    overlaps: [],
    clippedFits: [],
  };
  const fake = {
    setViewportSize: (s: { width: number }) => {
      viewport = String(s.width);
      return Promise.resolve();
    },
    evaluate: (code: unknown, arg?: unknown) => {
      if (typeof code === 'string') return Promise.resolve({ ...clean, ...seen });
      // The root font; the animations' time limit is the other number handed to the page.
      if (typeof arg === 'number' && arg < 100) log.push(`${viewport} ${String(arg)}`);
      const fn = code as (a?: unknown) => unknown;
      return Promise.resolve(fn(arg));
    },
    getByTestId: () => ({ first: () => ({ isVisible: () => Promise.resolve(false) }) }),
    waitForFunction: () => Promise.resolve(),
  };
  return { page: fake as unknown as Page, log };
}
const screen = { name: 'lobby', open: () => Promise.resolve() };
const sizes = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

describe('sweep', () => {
  it('sees every size, font and theme of every screen', async () => {
    const w = walker();
    const count = await sweep(w.page, [screen, { ...screen, name: 'game' }], { axe: false, sizes });
    expect(count).toBe(16);
    expect(w.log.slice(0, 4)).toEqual(['390 16', '390 16', '390 32', '390 32']);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('throws with every finding and its place, axe included', async () => {
    const w = walker({ hScroll: true, cut: ['p "x"'] });
    const run = sweep(w.page, [screen], {
      axe: () => Promise.resolve(['color-contrast: .a']),
      sizes: [{ width: 320, height: 568 }],
      fonts: [32],
      themes: ['dark'],
    });
    await expect(run).rejects.toThrow(
      [
        'the sweep found 3:',
        'lobby 320x568 32px dark: the page scrolls sideways',
        'lobby 320x568 32px dark: cut text: p "x"',
        'lobby 320x568 32px dark: axe: color-contrast: .a',
      ].join('\n'),
    );
  });

  it('leaves out what a screen allows, and reports the rest', async () => {
    const w = walker({
      outside: ['div.a', 'div.b'],
      smallTargets: ['a "x"'],
      clippedFits: ['s'],
    });
    const run = sweep(w.page, [{ ...screen, allow: ['div.a', 'small control', 'fitted'] }], {
      axe: false,
      sizes: [{ width: 320, height: 568 }],
      fonts: [16],
      themes: ['light'],
    });
    await expect(run).rejects.toThrow(/found 1:\n.*outside the window: div\.b$/);
  });
});

describe('sweep on a screen that does not open, or still moves', () => {
  it('reports a screen that does not open, and sees the others', async () => {
    const w = walker({ overlaps: ['a over b'] });
    const broken = { name: 'broken', open: () => Promise.reject(new Error('no button\ndetail')) };
    const run = sweep(w.page, [broken, screen], {
      axe: false,
      sizes: [{ width: 320, height: 568 }],
      fonts: [16],
      themes: ['light'],
    });
    await expect(run).rejects.toThrow(
      [
        'the sweep found 2:',
        'broken 320x568 16px light: did not open: no button',
        'lobby 320x568 16px light: overlapping control: a over b',
      ].join('\n'),
    );
  });

  it('waits for the animations that end, not for those that repeat', async () => {
    let ended = false;
    const animation = (endTime: number, finished: Promise<unknown>) =>
      ({ effect: { getComputedTiming: () => ({ endTime }) }, finished }) as unknown as Animation;
    const fade = new Promise((done) => setTimeout(done, 20)).then(() => {
      ended = true;
    });
    Object.assign(document, {
      getAnimations: () => [
        animation(200, fade),
        animation(Infinity, new Promise(() => undefined)),
        animation(50, Promise.reject(new Error('cancelled'))),
      ],
    });
    await sweep(walker().page, [screen], {
      axe: () => {
        expect(ended).toBe(true);
        return Promise.resolve([]);
      },
      sizes: [{ width: 320, height: 568 }],
      fonts: [16],
      themes: ['light'],
    });
    Reflect.deleteProperty(document, 'getAnimations');
  });

  it('refuses to see nothing', async () => {
    const w = walker();
    await expect(sweep(w.page, [], { axe: false })).rejects.toThrow(/nothing/);
    await expect(sweep(w.page, [screen], { axe: false, sizes: [] })).rejects.toThrow(/nothing/);
  });
});

describe('axeFinder', () => {
  it('runs the WCAG tags and names each rule with its targets', async () => {
    let tags: string[] = [];
    const excluded: string[] = [];
    class Builder {
      withTags(t: string[]): this {
        tags = t;
        return this;
      }
      exclude(selector: string): this {
        excluded.push(selector);
        return this;
      }
      analyze() {
        return Promise.resolve({
          violations: [{ id: 'label', nodes: [{ target: ['input'] }, { target: ['#a', 'b'] }] }],
        });
      }
    }
    expect(await axeFinder(Builder)({} as Page)).toEqual(['label: input, #a b']);
    expect(excluded).toEqual([]);
    await axeFinder(Builder, { exclude: ['iframe.chat', '#ad'] })({} as Page);
    expect(excluded).toEqual(['iframe.chat', '#ad']);
    expect(tags).toEqual(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  });
});
