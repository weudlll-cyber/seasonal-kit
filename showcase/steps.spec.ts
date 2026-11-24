/**
 * @file   showcase/steps.spec.ts
 * @brief  A member's step badges in the header's account chip, measured (v0.19.0).
 *
 * Responsibility: at the sizes layout.spec.ts already uses (1280, 1536, 1920 and 390 px), in light
 *                 and dark, the showcase's header with three steps shows three loaded icons, each
 *                 named by its step, 20 px (1.25rem) square, inside the chip and the window, with
 *                 no sideways scroll. Where the header folds (the phone), the icons are measured
 *                 in the opened menu, beside the name. The one-row rule for every header, this one
 *                 included, is layout.spec.ts's; axe over this header in both themes is
 *                 showcase.spec.ts's.
 * Depends on:     @playwright/test
 * Source:         new in the kit.
 */
import { expect, test, type Page } from '@playwright/test';

const NAMES = ['Diamond holder', 'Golden farmer', 'Early investor'];
// 1.25rem at the browser's 16 px default.
const ICON_PX = 20;

async function openChip(page: Page, width: number, theme: string) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`/?theme=${theme}`);
  const header = page.getByTestId('steps-header').getByTestId('app-header');
  // Folded (a phone): the chip sits in the menu, which opens first.
  if ((await header.getAttribute('data-sk-folded')) === 'true') {
    await header.getByTestId('menu-button').click();
  }
  return header.getByTestId('signed-in-as');
}

for (const theme of ['light', 'dark']) {
  for (const width of [1280, 1536, 1920, 390]) {
    test(`the step badges sit beside the name at ${String(width)} px, ${theme}`, async ({
      page,
    }) => {
      const chip = await openChip(page, width, theme);
      const seen = await chip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return {
          chipRight: box.right,
          chipLeft: box.left,
          scrollWidth: document.documentElement.scrollWidth,
          images: [...el.querySelectorAll('img')].map((img) => {
            const r = img.getBoundingClientRect();
            return {
              alt: img.alt,
              loaded: img.complete && img.naturalWidth > 0,
              width: r.width,
              height: r.height,
              left: r.left,
              right: r.right,
            };
          }),
        };
      });
      expect(seen.images.map((i) => i.alt)).toEqual(NAMES);
      for (const image of seen.images) {
        expect(image.loaded, `${image.alt} is loaded`).toBe(true);
        expect(image.width).toBeCloseTo(ICON_PX, 0);
        expect(image.height).toBeCloseTo(ICON_PX, 0);
        expect(image.left, 'inside the chip').toBeGreaterThanOrEqual(seen.chipLeft);
        expect(image.right, 'inside the chip').toBeLessThanOrEqual(seen.chipRight);
      }
      expect(seen.chipRight, 'the chip ends inside the window').toBeLessThanOrEqual(width);
      expect(seen.scrollWidth, 'no sideways scroll').toBeLessThanOrEqual(width);
    });
  }
}
