// @vitest-environment jsdom
/**
 * @file   src/testing/sweepMotion.test.ts
 * @brief  The sweep judges a screen only once nothing that ends is moving, late starts included.
 *
 * Responsibility: `motionEnded` waits for a running animation, also one that starts after its
 *                 first look, leaves one that repeats or is paused, and at the limit names what
 *                 still moves; the sweep reports that as a finding. The page's animations are
 *                 stated by the test.
 * Depends on:     vitest, jsdom
 * Source:         new in the kit.
 */
import type { Page } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { motionEnded } from './sweepMotion.js';

// The page's `evaluate` runs the handed function here, on jsdom's document.
const page = {
  evaluate: (fn: (arg: unknown) => unknown, arg: unknown) => Promise.resolve(fn(arg)),
} as unknown as Page;

// An animation of a `<div class="card">` that runs while `running()` says so.
function animation(running: () => boolean, endTime = 200, paused = false): Animation {
  const target = document.createElement('div');
  target.className = 'card big';
  return {
    get playState() {
      if (paused) return 'paused';
      return running() ? 'running' : 'finished';
    },
    pending: false,
    effect: { target, getComputedTiming: () => ({ endTime }) },
  } as unknown as Animation;
}
const states = (list: () => Animation[]): void => {
  Object.assign(document, { getAnimations: list });
};

afterEach(() => {
  Reflect.deleteProperty(document, 'getAnimations');
  vi.restoreAllMocks();
});

describe('motionEnded', () => {
  it('waits for an animation that starts after the first look', async () => {
    const start = Date.now();
    const age = (): number => Date.now() - start;
    let ended = false;
    states(() => {
      if (age() < 100) return [];
      ended = age() >= 300;
      return [animation(() => age() < 300)];
    });
    await expect(motionEnded(page)).resolves.toBeNull();
    expect(ended).toBe(true);
    expect(age()).toBeGreaterThanOrEqual(300);
  });

  it('leaves one that repeats for ever, and one that is paused', async () => {
    states(() => [animation(() => true, Infinity), animation(() => true, 200, true)]);
    await expect(motionEnded(page)).resolves.toBeNull();
  });

  it('gives up at the limit and says what still moves', async () => {
    let clock = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
    const bare = { playState: 'running', pending: false, effect: null } as unknown as Animation;
    states(() => [animation(() => true), bare]);
    await expect(motionEnded(page)).resolves.toBe('div.card, an animation');
  });

  it('says nothing where a page cannot list its animations', async () => {
    await expect(motionEnded(page)).resolves.toBeNull();
  });
});
