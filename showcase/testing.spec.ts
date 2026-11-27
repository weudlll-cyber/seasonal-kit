/**
 * @file   showcase/testing.spec.ts
 * @brief  The testing entry on a real browser: the sweep passes the kit's own screens and finds
 *         each kind of fault on a broken one (v0.23.0, K66).
 *
 * Responsibility: `sweep` runs the kit's header screen and its bar-and-start-card screen
 *                 (./sweep/main.tsx) through the seven default sizes, 100 % and 200 % root font,
 *                 light and dark, with axe, and finds nothing, the header's brand link among its
 *                 44 px targets (v0.28.0), which also leaves the header's height alone; on the
 *                 broken screen the probe names
 *                 the wide box, the cut text, the small button and the clipped fitted root, and
 *                 `sweep` fails with them; `captureLook` writes its four pictures.
 * Depends on:     @playwright/test, @axe-core/playwright, ../src/testing, ./screens
 * Source:         new in the kit.
 */
import { existsSync } from 'node:fs';

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { axeFinder, captureLook, probe, sweep } from '../src/testing/index.js';
import { SCREENS, settled } from './screens.js';

const screenOf = (name: string) => ({
  name,
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

// The brand link's box (K29, v0.28.0): 44 px or more, in a header as high as without the rule.
for (const width of [1536, 375]) {
  for (const font of [16, 32]) {
    const at = `${String(width)} px, ${String(font)} px text`;
    test(`the brand link is 44 px high and the header no higher: ${at}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await screenOf('header').open(page);
      await page.addStyleTag({ content: `html { font-size: ${String(font)}px }` });
      await settled(page);
      const heights = () =>
        page.locator('.sk-header').evaluate((header) => ({
          link: header.querySelector('.sk-header-brand')?.getBoundingClientRect().height ?? 0,
          header: header.getBoundingClientRect().height,
        }));
      const now = await heights();
      expect(now.link).toBeGreaterThanOrEqual(44);
      await page.addStyleTag({
        content: '.sk-header-brand { min-height: 0; margin-block: 0; padding-block: 0 }',
      });
      await settled(page);
      expect(now.header).toBe((await heights()).header);
    });
  }
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

test('the sweep counts the rows in sight and sets a screen up once', async ({ page }) => {
  let setUp = 0;
  const list = (least: number) => ({
    ...screenOf('list'),
    setup: () => {
      setUp += 1;
      return Promise.resolve();
    },
    floors: [{ selector: '.sweep-list li', least, decision: 'K116' }],
  });
  const looks = { axe: axeFinder(AxeBuilder), sizes: [{ width: 1280, height: 720 }], fonts: [16] };
  await expect(sweep(page, [list(5)], looks)).resolves.toBe(2);
  expect(setUp).toBe(1);
  await expect(sweep(page, [list(6)], looks)).rejects.toThrow(
    '.sweep-list li: 5 of at least 6 (K116)',
  );
});

test('captureLook writes both sizes in both themes', async ({ page }) => {
  await screenOf('header').open(page);
  await captureLook(page, SCREENS, 'sweep-header');
  for (const look of ['desktop-light', 'desktop-dark', 'phone-light', 'phone-dark']) {
    expect(existsSync(`${SCREENS}sweep-header-${look}.jpg`), look).toBe(true);
  }
});
