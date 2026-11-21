/**
 * @file   showcase/showcase.spec.ts
 * @brief  The showcase in every viewport and theme: a screenshot each, and no serious or
 *         critical axe violation.
 *
 * Responsibility: for 5 viewports × 2 themes × 2 docked screens (the start card, the result),
 *                 the page loads with that theme on <html>, a full-page screenshot lands in
 *                 showcase/screens/<screen>-<viewport>-<theme>.png (git-ignored, the previous
 *                 run's deleted by ./global-setup.ts), and axe with the WCAG 2.0–2.2 A and AA
 *                 rules finds nothing serious or critical. The phone viewports also show the
 *                 kit's phone layout (the chat bar instead of the strip).
 * Depends on:     @playwright/test, @axe-core/playwright, ./screens
 * Source:         seasonal-mini-games e2e/access.spec.ts and e2e/screens.ts at 866df03 (the axe
 *                 tags, the serious-or-critical filter, the light and dark screens).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { SCREENS, SCREENS_SHOWN, THEMES, VIEWPORTS } from './screens.js';

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const shown of SCREENS_SHOWN) {
      test(`${shown} at ${viewport.name} in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`/?theme=${theme}${shown === 'result' ? '&screen=result' : ''}`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const phone = viewport.width < 900;
        await expect(page.getByTestId('chat-dock')).toHaveAttribute(
          'data-view',
          phone ? 'phone' : 'desktop',
        );
        await page.screenshot({
          path: `${SCREENS}${shown}-${viewport.name}-${theme}.png`,
          fullPage: true,
        });
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
        expect(serious, `axe at ${viewport.name} in ${theme}`).toEqual([]);
      });
    }
  }
}
