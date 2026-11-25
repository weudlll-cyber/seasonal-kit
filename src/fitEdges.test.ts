// @vitest-environment jsdom
/**
 * @file   src/fitEdges.test.ts
 * @brief  The edges of the screen fit that mutation testing found unguarded, where jsdom's
 *         geometry can say (night audit 2026-11-25, piece 3).
 *
 * Responsibility: `nextScale` keeps the current scale when nothing is measured (0 used, 0 room);
 *                 half a pixel over still fits; the fit follows the visual viewport (a phone's
 *                 keyboard) and lets go of it; a frame asked for twice is cancelled once, and the
 *                 last one again on stop; the scale is written as the number it is. What needs
 *                 real boxes (scroll offsets, padding, the clipped-part counting) is measured in a
 *                 browser, in the showcase (showcase/layout.spec.ts), not here.
 * Depends on:     vitest, jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FIT_FLOORS, nextScale, settle, watchFit } from './fit.js';

const MG = FIT_FLOORS['mini-games'].scale;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('nextScale with nothing to measure', () => {
  it('keeps the scale when no height is used or no room is given', () => {
    expect(nextScale(0.8, 0, 400, MG)).toBe(0.8);
    expect(nextScale(0.8, -5, 400, MG)).toBe(0.8);
    expect(nextScale(0.8, 500, 0, MG)).toBe(0.8);
    expect(nextScale(0.8, 500, -1, MG)).toBe(0.8);
  });
});

// A screen whose one fixed part is `height` px high whatever the scale, in a box `room` high.
function screenOf(height: number, room: number) {
  const box = document.createElement('div');
  const root = document.createElement('div');
  const part = document.createElement('div');
  part.dataset['skFitFixed'] = '';
  root.append(part);
  box.append(root);
  document.body.append(box);
  Object.defineProperty(box, 'clientHeight', { get: () => room, configurable: true });
  part.getBoundingClientRect = () => new DOMRect(0, 0, 100, height);
  return { box, root };
}

describe('settle at the line between fitting and not', () => {
  it('half a pixel over still fits, and a little more does not', () => {
    const fits = screenOf(400.5, 400);
    expect(settle(fits.root, fits.box, MG)).toBe(1);
    const over = screenOf(401, 400);
    expect(settle(over.root, over.box, MG)).toBeLessThan(1);
  });

  it('writes the scale as the number it is, on the root', () => {
    const s = screenOf(300, 400);
    settle(s.root, s.box, MG);
    expect(s.root.style.getPropertyValue('--fit')).toBe('1');
  });
});

describe('the watch follows the visual viewport and the frames it asks for', () => {
  it('listens to the visual viewport, and lets go of it on stop', () => {
    const viewport = new EventTarget();
    const add = vi.spyOn(viewport, 'addEventListener');
    const remove = vi.spyOn(viewport, 'removeEventListener');
    vi.stubGlobal('visualViewport', viewport);
    const s = screenOf(300, 400);
    const stop = watchFit(s.root, 'mini-games', false);
    expect(add).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).not.toHaveBeenCalled();
    stop();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cancels a frame it asked for before asking again, and on stop', () => {
    const viewport = new EventTarget();
    vi.stubGlobal('visualViewport', viewport);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    // A box whose height the test changes, so each viewport event is a real resize.
    let room = 400;
    const s = screenOf(300, 400);
    Object.defineProperty(s.root, 'clientHeight', { get: () => room, configurable: true });
    // `self`: the root's own box is the one that is watched.
    const stop = watchFit(s.root, 'mini-games', true);
    room = 410;
    viewport.dispatchEvent(new Event('resize'));
    cancel.mockClear();
    room = 420;
    viewport.dispatchEvent(new Event('resize'));
    expect(cancel).toHaveBeenCalledTimes(1);
    cancel.mockClear();
    stop();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
