/**
 * @file   showcase/looks.spec.ts
 * @brief  What Bingo measured on its v0.22.0 adoption, proved in the kit (v0.33.0).
 *
 * Responsibility: on ./Fixtures' whole screens, in the browser's layout:
 *                 - at the six desktop sizes Bingo named, the dense result shows more rows whole
 *                   above the chat strip than the frame without it;
 *                 - the result's headline keeps its own line height under a game's tighter one,
 *                   so the two-line clamp cuts no descender;
 *                 - the full header stays one row at 1280x720 with fewer badges in the bar, all
 *                   three still in the chip's name; narrowing it, the badges go from all to one to
 *                   none before it folds, and the folded menu shows all three;
 *                 - the phone's chat bar text grows with the player's font size.
 * Depends on:     @playwright/test, ./screens, ./Fixtures.tsx
 * Source:         new in the kit.
 */
import { expect, test, type Page } from '@playwright/test';

import { settled } from './screens.js';

const SIZES = [
  [1280, 720],
  [1366, 768],
  [1536, 768],
  [1440, 900],
  [1900, 860],
  [1920, 1080],
] as const;
const NAMES = ['Diamond holder', 'Golden farmer', 'Early investor'];

async function open(page: Page, width: number, height: number, query: string): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(`/?theme=light&${query}`);
  await settled(page);
}

// The ranked rows that end inside the game's area, above the chat strip.
function rowsWhole(page: Page): Promise<number> {
  return page.locator('.sk-docked-main').evaluate((main) => {
    const bottom = main.getBoundingClientRect().bottom;
    return [...main.querySelectorAll('.showcase-places li')].filter(
      (li) => li.getBoundingClientRect().bottom <= bottom + 0.5,
    ).length;
  });
}

for (const [width, height] of SIZES) {
  test(`the dense result shows more places at ${String(width)}x${String(height)}`, async ({
    page,
  }) => {
    await open(page, width, height, 'screen=places');
    const plain = await rowsWhole(page);
    await open(page, width, height, 'screen=places&dense=1');
    const dense = await rowsWhole(page);
    // The headline and its line share a row.
    const title = await page.locator('.sk-result-head h2').boundingBox();
    const line = await page.locator('.sk-result-head p').boundingBox();
    expect(line?.y).toBeLessThan((title?.y ?? 0) + (title?.height ?? 0));
    expect(plain).toBeGreaterThan(0);
    expect(dense).toBeGreaterThan(plain);
  });
}

for (const query of ['screen=places', 'screen=places&dense=1']) {
  test(`a game's tight headings clip no descender: ${query}`, async ({ page }) => {
    await open(page, 1280, 720, query);
    await page.addStyleTag({ content: 'h2 { line-height: 1.15; }' });
    const headline = await page.locator('.sk-result-head h2').evaluate((h) => {
      const style = getComputedStyle(h);
      return {
        ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
        cut: h.scrollHeight - h.clientHeight,
      };
    });
    expect(headline.ratio).toBeCloseTo(1.3, 2);
    expect(headline.cut).toBeLessThanOrEqual(0);
  });
}

// How the full header stands: folded or how many badges the bar shows, and its rows.
function barOf(page: Page) {
  return page.getByTestId('app-header').evaluate((h) => {
    const shown = [...h.querySelectorAll('.sk-header-step')].filter(
      (img) => img.getBoundingClientRect().width > 2,
    ).length;
    return {
      state:
        h.getAttribute('data-sk-folded') === 'true' ? 'folded' : h.getAttribute('data-sk-steps'),
      shown,
      height: h.getBoundingClientRect().height,
    };
  });
}

test('the full bar keeps one row at 1280x720 by giving up badges', async ({ page }) => {
  await open(page, 1280, 720, 'screen=full-header');
  const seen = await barOf(page);
  expect(['one', 'none']).toContain(seen.state);
  expect(seen.shown).toBe(seen.state === 'one' ? 1 : 0);
  expect(seen.height).toBeLessThan(90);
  // Read out as before: the chip's name holds every step.
  const chip = page.getByTestId('signed-in-as');
  for (const name of NAMES) await expect(chip).toHaveAccessibleName(new RegExp(name));
});

test('narrowing, the badges go before the bar folds, and the menu shows all', async ({ page }) => {
  await open(page, 1800, 720, 'screen=full-header');
  const states: string[] = [];
  for (let width = 1800; width >= 800; width -= 8) {
    await page.setViewportSize({ width, height: 720 });
    await settled(page);
    const { state } = await barOf(page);
    if (state !== null && states.at(-1) !== state) states.push(state);
  }
  expect(states).toEqual(['all', 'one', 'none', 'folded']);
  await page.getByTestId('menu-button').click();
  expect((await barOf(page)).shown).toBe(3);
});

for (const font of [16, 32]) {
  test(`the chat bar's text follows a ${String(font)} px root font`, async ({ page }) => {
    await open(page, 390, 844, 'screen=places');
    await page.addStyleTag({ content: `html { font-size: ${String(font)}px; }` });
    const size = await page
      .locator('.sk-chat-bar')
      .evaluate((bar) => parseFloat(getComputedStyle(bar).fontSize));
    expect(size).toBeCloseTo(font * 0.875, 1);
  });
}
