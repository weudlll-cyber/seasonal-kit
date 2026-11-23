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

// The header never takes two rows (Bingo R1): at each width every app header's visible items
// share one row, the admin's long bar folding at 1280 px and the short ones unfolded on a wide
// screen. On a phone the back link has its own first row (./shell.css), so it is left out.
for (const width of [1280, 1536, 1920, 390]) {
  test(`every app header keeps one row at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?theme=light');
    const rows = await page.getByTestId('app-header').evaluateAll((headers) =>
      headers.map((h) => {
        const tops = [...h.children]
          .filter((c) => !c.classList.contains('sk-back-link'))
          .map((c) => c.getBoundingClientRect())
          .filter((r) => r.height > 0)
          .map((r) => r.top);
        return Math.max(...tops) - Math.min(...tops);
      }),
    );
    for (const spread of rows) expect(spread).toBeLessThanOrEqual(12);
  });
}

test('the admin bar folds at 1280 px by measure; a short bar stays unfolded at 1920 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?theme=light');
  const admin = page.getByTestId('admin-header').getByTestId('app-header');
  await expect(admin).toHaveAttribute('data-sk-folded', 'true');
  await page.setViewportSize({ width: 1920, height: 1000 });
  await expect(page.getByTestId('app-header').first()).toHaveAttribute('data-sk-folded', 'false');
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
