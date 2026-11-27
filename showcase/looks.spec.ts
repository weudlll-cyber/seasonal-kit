/**
 * @file   showcase/looks.spec.ts
 * @brief  Bingo's measurements of v0.22.0 and its header looks, proved in the kit.
 *
 * Responsibility: on ./Fixtures' whole screens, in the browser's layout:
 *                 - at the six desktop sizes Bingo named, the dense result shows more rows whole
 *                   above the chat strip than the frame without it;
 *                 - the result's headline keeps its own line height under a game's tighter one,
 *                   so the two-line clamp cuts no descender;
 *                 - the full header stays one row at 1280x720 with fewer badges in the bar, all
 *                   three still in the chip's name; narrowing it, the badges go from all to one to
 *                   none before it folds, and the folded menu shows all three;
 *                 - the phone's chat bar text grows with the player's font size;
 *                 - the header's chip is filled with small bold text and read as "Signed in as";
 *                   signed out, "Sign in" is solid and "Register" is not; on phones the back
 *                   link's row is its words' lines (or the little more its target needs) and the
 *                   target, hit-tested, 44 px or more, as the brand's under it stays (K96).
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
  // Some seventy widths, each laid out and settled: more than one test's usual time under load.
  test.setTimeout(120_000);
  await open(page, 1600, 720, 'screen=full-header');
  const states: string[] = [];
  for (let width = 1600; width >= 1000; width -= 8) {
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

// The header's three looks (K96), as the browser draws them.
function styleOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el);
    const token = (name: string): string => {
      const probe = document.createElement('i');
      probe.style.color = `var(${name})`;
      el.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    };
    return {
      background: style.backgroundColor,
      size: parseFloat(style.fontSize),
      weight: Number(style.fontWeight),
      filled: token('--sk-color-surface-2'),
      solid: token('--sk-color-solid'),
    };
  });
}

for (const theme of ['light', 'dark']) {
  test(`the account chip is filled with small bold text, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(`/?theme=${theme}&screen=full-header`);
    await settled(page);
    const chip = await styleOf(page, '.sk-header-chip');
    expect(chip.background).toBe(chip.filled);
    expect(chip.size).toBe(14);
    expect(chip.weight).toBeGreaterThanOrEqual(600);
    await expect(page.getByTestId('signed-in-as')).toHaveAccessibleName(
      /^Signed in as Maximilian-Alex \(organiser\)/,
    );
  });

  test(`"Sign in" is the solid button when signed out, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(`/?theme=${theme}&screen=places`);
    await settled(page);
    const signIn = await styleOf(page, '[data-testid="sign-in"]');
    expect(signIn.background).toBe(signIn.solid);
    const register = await styleOf(page, '[data-testid="register"]');
    expect(register.background).not.toBe(register.solid);
  });
}

// How high a target is as a finger meets it: the run of points, straight down through its middle,
// that the browser gives to the element. And what it takes in its row (its box with its margins)
// beside one line of its words.
function targetHeight(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const x = box.left + Math.min(box.width / 2, 40);
    let high = 0;
    for (let y = 0.5; y < box.bottom + 60; y += 1) {
      const hit = document.elementFromPoint(x, y);
      if (hit !== null && el.contains(hit)) high += 1;
    }
    return {
      high,
      box: box.height,
      row: box.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom),
      line: parseFloat(style.lineHeight),
      // The least the row can be: what 44 px lack beyond 0.25rem below and the header's 0.6rem.
      least: 44 - 0.85 * root,
    };
  });
}

for (const width of [390, 360, 320]) {
  for (const font of [16, 32]) {
    const at = `${String(width)} px, ${String(font)} px text`;
    test(`the back link: a low row, a 44 px target: ${at}`, async ({ page }) => {
      await open(page, width, 844, 'screen=full-header');
      await page.addStyleTag({
        content: `html { font-size: ${String(font)}px; } .sk-back-link { line-height: 1.4; }`,
      });
      await settled(page);
      const back = await targetHeight(page, '.sk-back-link');
      // The row holds the words' lines, or the least room the target needs: nothing more.
      const lines = Math.max(1, Math.round(back.row / back.line)) * back.line;
      expect(back.row).toBeLessThanOrEqual(Math.max(lines, back.least) + 0.5);
      expect(back.box).toBeGreaterThanOrEqual(44);
      expect(back.high).toBeGreaterThanOrEqual(44);
      // And it takes nothing from the brand's target under it.
      expect((await targetHeight(page, '.sk-header-brand')).high).toBeGreaterThanOrEqual(44);
      process.stdout.write(
        `MEASURE ${at}: target ${String(back.high)}, row ${back.row.toFixed(1)}, line ${back.line.toFixed(1)}\n`,
      );
    });
  }
}

// "Signed in as" from 1600 px up (K111): Cases' header by role at its sizes.
for (const width of [1280, 1366, 1536, 1920]) {
  for (const role of ['player', 'organiser', 'admin']) {
    test(`Cases' ${role} at ${String(width)} px: the prefix only from 1600 px`, async ({
      page,
    }) => {
      await open(page, width, width === 1920 ? 1080 : 768, `screen=cases-header&role=${role}`);
      const seen = await barOf(page);
      const prefix = await page.locator('.sk-header-chip-prefix').boundingBox();
      expect((prefix?.width ?? 0) > 2).toBe(width >= 1600 && seen.state !== 'folded');
      await expect(page.getByTestId('signed-in-as')).toHaveAccessibleName(/^Signed in as /);
      // The finding: an organiser's bar at 1536 px stays one row.
      if (width >= 1536) expect(seen.state).not.toBe('folded');
      if (process.env['SK_MEASURE'] === '1') {
        process.stdout.write(
          `MEASURE header ${String(width)} ${role}: ${String(seen.state)}, ${String(seen.shown)} badges\n`,
        );
      }
    });
  }
}
