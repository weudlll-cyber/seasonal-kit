/**
 * @file   showcase/sheet.spec.ts
 * @brief  The open phone chat sheet stays inside the space visibly left above the bar (v0.17.0).
 *
 * Responsibility: with a small `--sk-visible-height` (what DockedScreen publishes from
 *                 visualViewport while a phone's keyboard is open) and a large root font (a large
 *                 system font), the open sheet's top, its head with Close and the chat bar all lie
 *                 inside the visible height, at 375 × 667 and 390 × 844. With room to spare the
 *                 sheet is as tall as before (60 % of the window). A real on-screen keyboard is not
 *                 emulated: the visible height is set by hand, the way a keyboard would shrink it.
 * Depends on:     @playwright/test
 * Source:         new in the kit (the phone sheet of css/dock.css; Mini Games on Chrome Android,
 *                 2026-11-24).
 */
import { expect, test, type Page } from '@playwright/test';

// A game's root, as Mini Games has it (`#root { height: var(--sk-visible-height, 100dvh) }`): the
// docked screen's box is as high as the visible height and starts at the top of the window. The
// root font is 200 %: a large system font.
const GAME_ROOT_CSS = `
  html { font-size: 32px; }
  .showcase-box { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: var(--sk-visible-height); background: Canvas; }
`;

async function openSheet(page: Page, width: number, height: number, visible: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/?theme=light');
  await page.addStyleTag({ content: GAME_ROOT_CSS });
  // After DockedScreen's own value (set on load), so the test's value stays.
  await page.evaluate((px) => {
    document.documentElement.style.setProperty('--sk-visible-height', `${String(px)}px`);
  }, visible);
  await page.getByTestId('chat-bar').click();
  const sheet = page.getByRole('dialog', { name: 'Chat' });
  await expect(sheet).toBeVisible();
  const rect = (selector: string) =>
    page.evaluate((sel) => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      return { top: r?.top ?? NaN, bottom: r?.bottom ?? NaN };
    }, selector);
  // The height the sheet's rule gives it (a content box), as the browser used it.
  const content = await sheet.evaluate((el) => parseFloat(getComputedStyle(el).height));
  return {
    content,
    sheet: await rect('[role="dialog"][aria-label="Chat"]'),
    head: await rect('[role="dialog"][aria-label="Chat"] .sk-chat-dock-head'),
    close: await rect('.sk-chat-dock-close'),
    bar: await rect('[data-testid="chat-bar"]'),
  };
}

for (const [width, height] of [
  [375, 667],
  [390, 844],
] as const) {
  test(`the open sheet stays inside the visible height at ${String(width)} × ${String(height)}`, async ({
    page,
  }) => {
    // What a keyboard leaves: well under the 60 % the sheet asks for.
    const visible = Math.round(height * 0.55);
    const m = await openSheet(page, width, height, visible);
    expect(m.sheet.top, 'the sheet starts inside the visible area').toBeGreaterThanOrEqual(0);
    expect(m.head.top, 'the head is in the sheet').toBeGreaterThanOrEqual(m.sheet.top);
    expect(m.head.bottom).toBeLessThanOrEqual(m.sheet.bottom);
    expect(m.close.top, 'Close is visible').toBeGreaterThanOrEqual(0);
    expect(m.close.bottom).toBeLessThanOrEqual(visible);
    expect(m.sheet.bottom, 'the sheet is above the bar').toBeLessThanOrEqual(m.bar.top);
    expect(m.bar.bottom, 'the bar is inside the visible height').toBeLessThanOrEqual(visible);
  });
}

test('with room to spare the sheet keeps its height: 60 % of the window', async ({ page }) => {
  const m = await openSheet(page, 390, 844, 844);
  expect(m.content).toBeCloseTo(844 * 0.6, 0);
});
