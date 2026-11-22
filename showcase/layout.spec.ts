/**
 * @file   showcase/layout.spec.ts
 * @brief  What only a browser's layout shows: the space in the back link, measured.
 *
 * Responsibility: the back link's arrow and its words "Seasonal Entertainment" are apart by a
 *                 visible gap, measured from the arrow's box to the text's own box (a Range),
 *                 not read from textContent, which has the space either way (Bingo R2,
 *                 Seasonal Party; v0.11.0).
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
