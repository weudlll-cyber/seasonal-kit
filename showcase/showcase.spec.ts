/**
 * @file   showcase/showcase.spec.ts
 * @brief  The showcase in every viewport and theme: a screenshot each, and no serious or
 *         critical axe violation; the app header's folded menu and dev menu opened on phones.
 *
 * Responsibility: for 5 viewports × 2 themes × 2 docked screens (the start card, the result),
 *                 the page loads with that theme on <html>, a full-page screenshot lands in
 *                 showcase/screens/<screen>-<viewport>-<theme>.png (git-ignored, the previous
 *                 run's deleted by ./global-setup.ts), and axe with the WCAG 2.0–2.2 A and AA
 *                 rules finds nothing serious or critical. The phone viewports also show the
 *                 kit's phone layout (the chat bar instead of the strip). On each phone viewport
 *                 and theme the header's menu is opened, then the dev sign-in menu inside the
 *                 third header, each checked by axe, the screen `header-menu-…`.
 * Depends on:     @playwright/test, @axe-core/playwright, ./screens
 * Source:         seasonal-mini-games e2e/access.spec.ts and e2e/screens.ts at 866df03 (the axe
 *                 tags, the serious-or-critical filter, the light and dark screens).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { SCREENS, SCREENS_SHOWN, THEMES, VIEWPORTS } from './screens.js';

// Serious or critical axe violations of the page as it is now, as "rule: targets".
async function seriousViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

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
        expect(await seriousViolations(page), `axe at ${viewport.name} in ${theme}`).toEqual([]);
      });
    }
    if (viewport.width >= 960) continue;
    test(`header menu at ${viewport.name} in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/?theme=${theme}`);
      const menus = page.getByTestId('menu-button');
      await menus.first().click();
      await expect(menus.first()).toHaveAttribute('aria-expanded', 'true');
      expect(await seriousViolations(page), `menu at ${viewport.name}`).toEqual([]);
      // The third header's menu holds the dev tools.
      await menus.first().click();
      await menus.nth(2).click();
      await page.getByTestId('dev-menu').click();
      await expect(page.getByTestId('dev-menu-panel').first()).toBeVisible();
      await page.screenshot({
        path: `${SCREENS}header-menu-${viewport.name}-${theme}.png`,
        fullPage: true,
      });
      expect(await seriousViolations(page), `dev menu at ${viewport.name}`).toEqual([]);
    });
  }
}
