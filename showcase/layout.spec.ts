/**
 * @file   showcase/layout.spec.ts
 * @brief  What only a browser's layout shows, measured: the space in the back link, the game
 *         bar on narrow phones.
 *
 * Responsibility: the back link's arrow and its words "Seasonal Entertainment" are apart by a
 *                 visible gap, measured from the arrow's box to the text's own box (a Range),
 *                 not read from textContent, which has the space either way (Bingo R2,
 *                 Seasonal Party; v0.11.0). A crowded game bar ends inside 320, 360 and 375 px,
 *                 each button still 44 px wide (Cases 32; v0.11.0). The bar's back link shows
 *                 arrow and words on a desktop and the arrow alone, 44 px wide, on a phone, with
 *                 the words as its name (v0.12.0). The result frame without a reveal is one column
 *                 and with a middle card keeps it between the first part and "more" (v0.15.0). The
 *                 header's Menu button shows only when folded, whichever of header.css and bar.css
 *                 comes last (v0.27.0). A docked screen whose content scrolls passes axe's
 *                 scrollable-region-focusable (v0.27.0).
 * Depends on:     @playwright/test, @axe-core/playwright
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { AxeBuilder } from '@axe-core/playwright';
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
      // The words are a part of their own since v0.12.0: the text inside it is what is measured.
      const words = link.querySelector('.sk-back-words')?.firstChild;
      if (arrow === null || words === undefined || words === null) return -1;
      const range = document.createRange();
      range.selectNodeContents(words);
      const text = [...range.getClientRects()].find((r) => r.width > 0);
      return (text?.left ?? 0) - arrow.getBoundingClientRect().right;
    });
  expect(gap).toBeGreaterThanOrEqual(MIN_GAP_PX);
});

// The Menu button carries two of the kit's classes; whichever file a game imports last, it
// shows only in a folded header (Seasonal Cases, v0.27.0).
const sheet = (name: string): string =>
  readFileSync(new URL(`../css/${name}`, import.meta.url), 'utf8');

for (const order of [
  ['bar.css', 'header.css'],
  ['header.css', 'bar.css'],
]) {
  test(`the Menu button shows only when folded, with ${order.join(' before ')}`, async ({
    page,
  }) => {
    const styles = order.map((name) => `<style>${sheet(name)}</style>`).join('');
    const button = '<button class="sk-bar-button sk-menu-button">Menu</button>';
    await page.setContent(
      `${styles}<header class="sk-header" data-sk-folded="false">${button}</header>`,
    );
    const menu = page.locator('button');
    await expect(menu).toHaveCSS('display', 'none');
    await page.locator('header').evaluate((h) => {
      h.setAttribute('data-sk-folded', 'true');
    });
    // `inline-flex`, which a flex item computes to `flex`.
    await expect(menu).toHaveCSS('display', 'flex');
  });
}

// The bar's own padding is a game's to set (Mini Games, v0.27.0); unset, as before.
for (const [width, unset] of [
  [1280, '32px'],
  [800, '8px'],
  [360, '4px'],
] as const) {
  test(`the game bar's gutter is a token at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const styles = ['tokens.css', 'bar.css'].map((n) => `<style>${sheet(n)}</style>`).join('');
    await page.setContent(`${styles}<div class="sk-game-bar">Round 1</div>`);
    const bar = page.locator('.sk-game-bar');
    await expect(bar).toHaveCSS('padding-left', unset);
    await page.addStyleTag({ content: ':root { --sk-bar-gutter: 0px; }' });
    await expect(bar).toHaveCSS('padding-left', '0px');
    await expect(bar).toHaveCSS('padding-right', '0px');
  });
}

// A docked screen's content that scrolls is reachable and named (axe, Seasonal Cases, v0.27.0).
for (const [width, height] of [
  [1536, 768],
  [390, 844],
] as const) {
  for (const theme of ['light', 'dark']) {
    const at = `${String(width)} px, ${theme}`;
    test(`a scrolling docked screen is reachable by keyboard: ${at}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/?theme=${theme}`);
      const main = page.locator('.sk-docked-main').first();
      // Text alone, running past the box: nothing inside it can take the focus.
      await main.evaluate((box) => {
        const lines = Array.from({ length: 200 }, () => {
          const line = document.createElement('p');
          line.textContent = 'A long result.';
          return line;
        });
        box.replaceChildren(...lines);
        box.style.overflowY = 'auto';
        box.dataset['testid'] = 'scrolling';
      });
      const found = await new AxeBuilder({ page })
        .include('[data-testid="scrolling"]')
        .withRules(['scrollable-region-focusable'])
        .analyze();
      expect(found.passes.map((rule) => rule.id)).toEqual(['scrollable-region-focusable']);
      expect(found.violations).toEqual([]);
      await expect(page.getByRole('region', { name: 'Game screen' }).first()).toHaveAttribute(
        'tabindex',
        '0',
      );
    });
  }
}

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

// The back link in the game bar (v0.12.0): arrow and words on a desktop, the arrow alone in a
// 44 px target on a phone, the words still its name; the bar ends inside the screen at 320 px.
for (const [width, alone] of [
  [1280, false],
  [390, true],
  [320, true],
] as const) {
  test(`the bar's back link at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/?theme=light');
    const bar = page.getByTestId('back-bar').getByTestId('game-bar');
    const link = bar.getByTestId('back-link');
    await expect(link).toHaveAccessibleName('Seasonal Entertainment');
    const seen = await bar.evaluate((el) => {
      const words = el.querySelector('.sk-back-words')?.getBoundingClientRect();
      const back = el.querySelector('.sk-back-link')?.getBoundingClientRect();
      return {
        words: words?.width ?? -1,
        back: back?.width ?? -1,
        first: el.firstElementChild?.classList.contains('sk-back-link') ?? false,
        itemsEnd: Math.max(...[...el.children].map((c) => c.getBoundingClientRect().right)),
        right: el.getBoundingClientRect().right,
      };
    });
    expect(seen.first).toBe(true);
    if (alone) {
      expect(seen.words).toBeLessThanOrEqual(1);
      expect(seen.back).toBeGreaterThanOrEqual(44);
    } else {
      expect(seen.words).toBeGreaterThan(40);
    }
    expect(seen.itemsEnd).toBeLessThanOrEqual(seen.right + 0.5);
    expect(seen.right).toBeLessThanOrEqual(width);
  });
}

// What the result's first part keeps for its padding and border on both sides, in CSS px.
const PADDING_PX = 64;

// The result frame (v0.15.0): with a reveal it is today's two columns on a desktop; without one it
// renders no reveal box and is one column at every width; a middle card sits between the first
// part and "more", in the page's width.
for (const width of [1280, 1920, 390]) {
  test(`the result frame without a reveal and with a middle card at ${String(width)} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?theme=light');
    const box = (testId: string, part: string) =>
      page
        .getByTestId(testId)
        .locator(part)
        .first()
        .evaluate((e) => {
          const r = e.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
        });
    // Without a reveal: no box for it, the placings as wide as the first part.
    await expect(page.getByTestId('result-no-reveal').locator('.sk-result-reveal')).toHaveCount(0);
    await expect(page.getByTestId('result-no-reveal').getByTestId('result')).toHaveAttribute(
      'data-sk-reveal',
      'none',
    );
    const first = await box('result-no-reveal', '.sk-result-first');
    const places = await box('result-no-reveal', '.sk-result-places');
    // One column: the placings span the first part inside its padding and border (≤ 64 px).
    expect(places.width).toBeGreaterThan(first.width - PADDING_PX);
    // With a reveal and a middle card: the two columns stay on a desktop, the card is in order.
    const withFirst = await box('result-with-middle', '.sk-result-first');
    const withPlaces = await box('result-with-middle', '.sk-result-places');
    if (width >= 900) expect(withPlaces.width).toBeLessThan(withFirst.width * 0.6);
    else expect(withPlaces.width).toBeGreaterThan(withFirst.width - PADDING_PX);
    const middle = await box('result-with-middle', '.sk-result-middle');
    const more = await box('result-with-middle', '.sk-result-more');
    expect(middle.top).toBeGreaterThanOrEqual(withFirst.bottom);
    expect(more.top).toBeGreaterThanOrEqual(middle.bottom);
    expect(Math.abs(middle.width - withFirst.width)).toBeLessThanOrEqual(1);
  });
}

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
