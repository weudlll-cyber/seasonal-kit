/**
 * @file   showcase/layout.spec.ts
 * @brief  What only a browser's layout shows, measured: the space in the back link, the game
 *         bar on narrow phones.
 *
 * Responsibility: the back link's arrow and its words "Seasonal Entertainment" are apart by a
 *                 visible gap, measured from the arrow's box to the text's own box (a Range),
 *                 not read from textContent, which has the space either way (Bingo R2,
 *                 Seasonal Party; v0.11.0). A crowded game bar ends inside 320, 360 and 375 px,
 *                 each button still 44 px wide (Cases 32; v0.11.0).
 * Depends on:     @playwright/test
 * Source:         new in the kit.
 */
import { expect, test } from '@playwright/test';

// At least this much, in CSS px, between the arrow and the words: a third of the small text.
const MIN_GAP_PX = 4;

test('the back link keeps a gap between arrow and words', async ({ page }) => {
  await page.goto('/?theme=light');
  const gap = await page
    .getByTestId('back-link')
    .first()
    .evaluate((link) => {
      const arrow = link.querySelector('[aria-hidden="true"]');
      const words = [...link.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
      );
      if (arrow === null || words === undefined) return -1;
      const range = document.createRange();
      range.selectNodeContents(words);
      const text = [...range.getClientRects()].find((r) => r.width > 0);
      return (text?.left ?? 0) - arrow.getBoundingClientRect().right;
    });
  expect(gap).toBeGreaterThanOrEqual(MIN_GAP_PX);
});

// Narrow phones (Cases 32): a crowded game bar stays inside its width, its buttons 44 px.
for (const width of [320, 360, 375]) {
  test(`a crowded game bar fits ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/?theme=light');
    const bar = page.getByTestId('busy-bar').getByTestId('game-bar');
    // The bar's own items (the unread badge sits over its button's corner on purpose).
    const seen = await bar.evaluate((el) => ({
      itemsEnd: Math.max(...[...el.children].map((c) => c.getBoundingClientRect().right)),
      right: el.getBoundingClientRect().right,
      buttons: [...el.querySelectorAll('.sk-bar-button')].map((b) => b.getBoundingClientRect()),
    }));
    expect(seen.itemsEnd, 'every item ends inside the bar').toBeLessThanOrEqual(seen.right + 0.5);
    expect(seen.right, 'the bar ends inside the screen').toBeLessThanOrEqual(width);
    for (const b of seen.buttons) {
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.right).toBeLessThanOrEqual(width);
    }
  });
}
