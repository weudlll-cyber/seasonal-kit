/**
 * @file   showcase/testing.spec.ts
 * @brief  The testing entry on a real browser: the sweep passes the kit's own screens and finds
 *         each kind of fault on a broken one (v0.23.0, K66).
 *
 * Responsibility: `sweep` runs the kit's header screen and its bar-and-start-card screen
 *                 (./sweep/main.tsx) through the seven default sizes, 100 % and 200 % root font,
 *                 light and dark, with axe, and finds nothing; on the broken screen the probe names
 *                 the wide box, the cut text, the small button and the clipped fitted root, and
 *                 `sweep` fails with them; `captureLook` writes its four pictures.
 * Depends on:     @playwright/test, @axe-core/playwright, ../src/testing, ./screens
 * Source:         new in the kit.
 */
import { existsSync } from 'node:fs';

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { axeFinder, captureLook, probe, sweep } from '../src/testing/index.js';
import { SCREENS } from './screens.js';

// Known and reported to the owner, not changed here: the header's brand link is 36 px high on a
// desktop and 19 px on a phone, under the kit's 44 px (K29).
const KNOWN = ['a.sk-header-brand'];

const screenOf = (name: string) => ({
  name,
  allow: KNOWN,
  open: async (page: Page) => {
    await page.goto(`/sweep/?screen=${name}`);
    await page.locator('#root > *').first().waitFor();
  },
});

for (const name of ['header', 'bar']) {
  test(`the sweep finds nothing on the kit's ${name} screen`, async ({ page }) => {
    // 7 sizes x 2 fonts x 2 themes, each probed and checked by axe.
    test.setTimeout(180_000);
    const seen = await sweep(page, [screenOf(name)], { axe: axeFinder(AxeBuilder) });
    expect(seen).toBe(28);
  });
}

test('the probe names every kind of fault on the broken screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await screenOf('broken').open(page);
  const found = await probe(page);
  expect(found.hScroll).toBe(true);
  expect(found.outside.join()).toContain('[wide]');
  expect(found.cut.join()).toContain('[cut]');
  expect(found.smallTargets).toEqual(['[tiny] button.sweep-tiny "x" 20x20']);
  expect(found.clippedFits.join()).toContain('[clipped]');
});

test('the sweep fails on the broken screen', async ({ page }) => {
  const run = sweep(page, [screenOf('broken')], {
    axe: false,
    sizes: [{ width: 320, height: 568 }],
    themes: ['light'],
  });
  await expect(run).rejects.toThrow(/broken 320x568 32px light: clipped fitted root/);
});

test('captureLook writes both sizes in both themes', async ({ page }) => {
  await screenOf('header').open(page);
  await captureLook(page, SCREENS, 'sweep-header');
  for (const look of ['desktop-light', 'desktop-dark', 'phone-light', 'phone-dark']) {
    expect(existsSync(`${SCREENS}sweep-header-${look}.jpg`), look).toBe(true);
  }
});
