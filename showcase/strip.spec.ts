/**
 * @file   showcase/strip.spec.ts
 * @brief  The docked chat strip of a low desktop window: 100 px, a field and two messages whole
 *         (K126).
 *
 * Responsibility: on `?screen=strip` at 1024x600 and 1278x629, with a 16 and a 32 px root font:
 *                 the strip is 100 px and in the window; the field is whole inside the chat's
 *                 card and a target at least 44 px high; at least two messages show whole; the
 *                 game's main area is 50 px higher than with the former 150 px strip; the page
 *                 does not scroll.
 * Depends on:     @playwright/test, ./screens, ./Fixtures.tsx
 * Source:         new in the kit.
 */
import { expect, test, type Page } from '@playwright/test';

import { settled } from './screens.js';

const SIZES = [
  [1024, 600],
  [1278, 629],
] as const;
const FONTS = [16, 32] as const;

// The strip, the field, the messages shown whole and the game's area above, in CSS px.
const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (selector: string) => {
      const found = document.querySelector(selector);
      if (found === null) throw new Error(`not drawn: ${selector}`);
      return found.getBoundingClientRect();
    };
    const card = box('.sk-chat-dock-body');
    const list = box('.showcase-strip-lines');
    const field = box('.showcase-strip-form input');
    const row = box('.sk-chat-dock-row');
    const within = (r: DOMRect, outer: DOMRect) =>
      r.top >= outer.top - 0.5 && r.bottom <= outer.bottom + 0.5;
    const lines = [...document.querySelectorAll('.showcase-strip-lines li')];
    return {
      strip: row.height,
      inWindow: row.bottom <= window.innerHeight + 0.5,
      fieldHeight: field.height,
      fieldWhole: within(field, card),
      listInCard: within(list, card),
      whole: lines.filter((l) => within(l.getBoundingClientRect(), list)).length,
      main: box('.sk-docked-main').height,
      scrolls: document.documentElement.scrollHeight > window.innerHeight,
    };
  });

for (const [width, height] of SIZES) {
  for (const font of FONTS) {
    test(`the 100 px strip at ${String(width)} x ${String(height)}, font ${String(font)}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/?theme=light&screen=strip');
      await page.addStyleTag({ content: `html { font-size: ${String(font)}px; }` });
      await settled(page);
      const seen = await measure(page);
      expect(seen).toMatchObject({
        strip: 100,
        inWindow: true,
        fieldWhole: true,
        listInCard: true,
        scrolls: false,
      });
      expect(seen.fieldHeight).toBeGreaterThanOrEqual(44);
      expect(seen.whole).toBeGreaterThanOrEqual(2);
      // Against the former strip, set by hand on the same page.
      await page.addStyleTag({ content: '.sk-docked { --sk-dock-height: 150px !important; }' });
      await settled(page);
      expect(seen.main - (await measure(page)).main).toBeCloseTo(50, 0);
    });
  }
}
