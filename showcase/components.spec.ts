/**
 * @file   showcase/components.spec.ts
 * @brief  The base components' page: four looks side by side, readable in both themes (K78).
 *
 * Responsibility: the page shows the kit's and the three games' columns; the kit's buttons, inputs
 *                 and selects are at least 44 px high; axe finds nothing serious or critical in
 *                 the kit's column in light and dark; a picture of each theme is saved for the
 *                 owner (showcase/screens/, git-ignored); at 1280x720 and 390x844 the page does
 *                 not scroll sideways.
 * Depends on:     @playwright/test, @axe-core/playwright, ./screens
 * Source:         new in the kit.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { SCREENS, THEMES } from './screens.js';

for (const theme of THEMES) {
  test(`the base components beside the games' looks, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(`/components/?theme=${theme}`);
    await expect(page.getByRole('region')).toHaveCount(4);
    const controls = page.locator('.look-kit :is(button, input, select)');
    for (const control of await controls.all()) {
      expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    const found = await new AxeBuilder({ page })
      .include('.look-kit')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(
      found.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
    await page.screenshot({ path: `${SCREENS}components-${theme}.png`, fullPage: true });
  });
}

// The sizes of the owner's look (v0.34.0): both themes, no sideways scroll.
for (const theme of THEMES) {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ] as const) {
    test(`no sideways scroll at ${String(width)}x${String(height)}, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/components/?theme=${theme}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('.look-kit .sk-btn').first()).toBeVisible();
      const wide = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(wide).toBeLessThanOrEqual(width);
    });
  }
}
