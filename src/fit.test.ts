// @vitest-environment jsdom
/**
 * @file   src/fit.test.ts
 * @brief  The screen's scale: 1 when it fits, an even shrink, the game's floor, no loop, and
 *         fitting again only on a new size.
 *
 * Responsibility: Mini Games' fit.test.ts (apps/web/src/round at 866df03) with the floor passed
 *                 per game: `nextScale` keeps a fitting scale, shrinks in proportion, never above
 *                 1 or below the floor. `settle` starts from 1, sets `--fit` and `data-sk-fit-scale`,
 *                 finds the largest fitting scale in at most nine measurements, stops at the
 *                 floor, and a floor of 1 never shrinks. Added: the box is the
 *                 nearest one that clips or scrolls; a part's hidden overflow counts; `watchFit`
 *                 fits again in the next frame only when the size changed, and stops cleanly.
 *                 With `afterFonts` (v0.12.0) it also fits again after `loadingdone` and
 *                 `fonts.ready`; without it, never.
 * Depends on:     vitest, jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boxOf, FIT_FLOORS, nextScale, settle, watchFit } from './fit.js';

const MG = FIT_FLOORS['mini-games'].scale;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('nextScale', () => {
  it('keeps the scale when the fixed parts fit', () => {
    expect(nextScale(1, 400, 400, MG)).toBe(1);
    expect(nextScale(0.8, 300, 400, MG)).toBe(0.8);
    expect(nextScale(0.8, 0, 0, MG)).toBe(0.8);
    // Half a pixel over is layout rounding, and still fits; more is not (v0.10.1, named).
    expect(nextScale(1, 400.5, 400, MG)).toBe(1);
    expect(nextScale(1, 400.6, 400, MG)).toBeLessThan(1);
  });

  it('shrinks in proportion to the room, never above 1 or below the floor', () => {
    expect(nextScale(1, 500, 400, MG)).toBeCloseTo(0.795, 3);
    expect(nextScale(0.9, 450, 400, MG)).toBeCloseTo(0.795, 3);
    expect(nextScale(1, 4000, 400, MG)).toBe(MG);
  });
});

// A screen whose fixed part is `natural` px high at scale 1 plus `fixed` px that never shrink,
// in a box `room` px high; counts the measurements.
function screenOf(natural: number, fixed: number, room: number) {
  const box = document.createElement('div');
  const root = document.createElement('div');
  const part = document.createElement('div');
  part.dataset['skFitFixed'] = '';
  root.append(part);
  box.append(root);
  document.body.append(box);
  let reads = 0;
  let height = room;
  let tall = natural;
  Object.defineProperty(box, 'clientHeight', { get: () => height });
  part.getBoundingClientRect = () => {
    reads += 1;
    const scale = parseFloat(root.style.getPropertyValue('--fit')) || 1;
    return new DOMRect(0, 0, 100, fixed + tall * scale);
  };
  return {
    box,
    root,
    part,
    reads: () => reads,
    resize: (h: number) => {
      height = h;
    },
    // The part's height at scale 1 changes: its text wraps once a late font has loaded.
    setNatural: (h: number) => {
      tall = h;
    },
  };
}

describe('settle', () => {
  it('leaves a screen with room at 1', () => {
    const s = screenOf(300, 0, 400);
    expect(settle(s.root, s.box, MG)).toBe(1);
    expect(s.root.style.getPropertyValue('--fit')).toBe('1');
    expect(s.root.dataset['skFitScale']).toBe('1');
    expect(s.reads()).toBe(1);
  });

  it('shrinks evenly until the fixed parts fit, to the largest scale within 1 %', () => {
    const s = screenOf(500, 0, 400);
    const scale = settle(s.root, s.box, MG);
    expect(500 * scale).toBeLessThanOrEqual(400);
    expect(scale).toBeGreaterThan(0.79);
  });

  it('finds the largest fitting scale with a part that does not shrink, in few passes', () => {
    const s = screenOf(400, 100, 400);
    const scale = settle(s.root, s.box, MG);
    expect(100 + 400 * scale).toBeLessThanOrEqual(400.5);
    expect(scale).toBeGreaterThan(0.74);
    expect(s.reads()).toBeLessThanOrEqual(9);
  });

  it('stops at the floor when the parts cannot fit, and starts from 1 again', () => {
    const s = screenOf(2_000, 0, 400);
    expect(settle(s.root, s.box, MG)).toBe(MG);
    expect(s.reads()).toBeLessThanOrEqual(9);
    expect(settle(s.root, s.box, MG)).toBe(MG);
  });

  it('never shrinks at a floor of 1, and measures nothing for it', () => {
    const s = screenOf(2_000, 0, 400);
    expect(settle(s.root, s.box, 1)).toBe(1);
    expect(s.reads()).toBe(0);
  });

  it('counts what a part hides in a box that clips, and measures all children when none is marked', () => {
    const s = screenOf(300, 0, 400);
    delete s.part.dataset['skFitFixed'];
    s.part.style.overflowY = 'hidden';
    Object.defineProperty(s.part, 'scrollHeight', { value: 500 });
    Object.defineProperty(s.part, 'clientHeight', { value: 300 });
    // 300 px laid out plus 200 px hidden does not fit 400 px.
    expect(settle(s.root, s.box, MG)).toBeLessThan(1);
  });

  it('takes 1 px of scroll over a clipping box as rounding, 2 px as hidden (v0.10.1, named)', () => {
    const hiding = (over: number): number => {
      const s = screenOf(399, 0, 400);
      s.part.style.overflowY = 'hidden';
      Object.defineProperty(s.part, 'scrollHeight', { value: 300 + over });
      Object.defineProperty(s.part, 'clientHeight', { value: 300 });
      return settle(s.root, s.box, MG);
    };
    expect(hiding(1)).toBe(1);
    expect(hiding(2)).toBeLessThan(1);
  });
});

describe('boxOf', () => {
  it('is the nearest box that clips or scrolls, else the page', () => {
    const outer = document.createElement('div');
    const root = document.createElement('div');
    outer.append(root);
    document.body.append(outer);
    expect(boxOf(root)).toBe(document.documentElement);
    outer.style.overflowY = 'auto';
    expect(boxOf(root)).toBe(outer);
    root.style.overflowY = 'hidden';
    expect(boxOf(root)).toBe(root);
  });
});

describe('watchFit', () => {
  it('fits now, again in the next frame on a new size only, and stops', () => {
    let observed: (() => void) | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observed = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const s = screenOf(300, 0, 400);
    s.box.style.overflowY = 'auto';
    const stop = watchFit(s.root, 'mini-games');
    expect(s.root.dataset['skFitScale']).toBe('1');
    const fire = observed as unknown as () => void;
    fire();
    expect(frames).toHaveLength(0);
    s.resize(200);
    fire();
    expect(frames).toHaveLength(1);
    frames[0]?.(0);
    expect(Number(s.root.dataset['skFitScale'])).toBeLessThan(1);
    stop();
    expect(disconnect).toHaveBeenCalled();
  });

  it('fits the root itself when told it fills a height of its own, without a ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const s = screenOf(300, 0, 400);
    Object.defineProperty(s.root, 'clientHeight', { value: 100 });
    const stop = watchFit(s.root, 'mini-games', true);
    expect(Number(s.root.dataset['skFitScale'])).toBeLessThan(1);
    stop();
  });
});

// A font set that a test settles by hand: `loadingdone` as on the real one, `ready` a promise.
function fakeFonts() {
  const target = new EventTarget();
  let ready: () => void = () => undefined;
  const set = Object.assign(target, {
    ready: new Promise<void>((resolve) => {
      ready = resolve;
    }),
  });
  Object.defineProperty(document, 'fonts', { value: set, configurable: true });
  return {
    target,
    ready: () => {
      ready();
    },
  };
}

// A screen that fits at 1 until its text wraps: the part grows after the first fitting.
function lateScreen() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('ResizeObserver', undefined);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const s = screenOf(300, 0, 400);
  s.box.style.overflowY = 'auto';
  return { s, frames };
}

describe('watchFit after web fonts (v0.12.0)', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'fonts');
  });

  it('fits again on loadingdone and on fonts.ready, in the next frame, and stops listening', async () => {
    const fonts = fakeFonts();
    const { s, frames } = lateScreen();
    const stop = watchFit(s.root, 'mini-games', false, { afterFonts: true });
    expect(s.root.dataset['skFitScale']).toBe('1');
    // The late font wraps the text: 500 px now, the box still 400 px.
    s.setNatural(500);
    fonts.target.dispatchEvent(new Event('loadingdone'));
    expect(frames).toHaveLength(1);
    frames[0]?.(0);
    expect(Number(s.root.dataset['skFitScale'])).toBeLessThan(1);
    s.setNatural(300);
    fonts.ready();
    await Promise.resolve();
    expect(frames).toHaveLength(2);
    frames[1]?.(0);
    expect(s.root.dataset['skFitScale']).toBe('1');
    stop();
    fonts.target.dispatchEvent(new Event('loadingdone'));
    expect(frames).toHaveLength(2);
  });

  it('does not fit again once stopped before the fonts were ready', async () => {
    const fonts = fakeFonts();
    const { s, frames } = lateScreen();
    watchFit(s.root, 'mini-games', false, { afterFonts: true })();
    fonts.ready();
    await Promise.resolve();
    expect(frames).toHaveLength(0);
  });

  it('does nothing with fonts by default, and nothing where there is no font set', () => {
    const fonts = fakeFonts();
    const off = lateScreen();
    const stopOff = watchFit(off.s.root, 'mini-games');
    fonts.target.dispatchEvent(new Event('loadingdone'));
    expect(off.frames).toHaveLength(0);
    stopOff();
    Reflect.deleteProperty(document, 'fonts');
    const none = lateScreen();
    expect(() => {
      watchFit(none.s.root, 'mini-games', false, { afterFonts: true })();
    }).not.toThrow();
  });
});
