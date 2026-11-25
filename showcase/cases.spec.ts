/**
 * @file   showcase/cases.spec.ts
 * @brief  What Seasonal Cases measured on its kit adoption, now proved in the kit (v0.22.0).
 *
 * Responsibility: each test is one of Cases' four patches, measured in the browser at the sizes
 *                 and settings it named (1536x768, 1280x720, 390x844, 375x667, 360x780; root font
 *                 100 % and 200 %; light and dark):
 *                 - the header folds only where Cases' bar (back link, brand, six links, a member
 *                   with three steps) does not fit one row: forced open it takes two rows at 1280
 *                   and 1536 px and one at 1920 px; Cases' own brand rule changes no box there;
 *                 - at one width every header folds alike, loaded there or resized to it
 *                   (v0.27.0);
 *                 - the folded brand never lies under the Menu button, at any phone width and at
 *                   200 %: when the brand and the controls do not share a row, the controls take
 *                   a row of their own below it; the header ends inside the window;
 *                 - the longest member's chip (24 characters, a rank, three steps) ends inside
 *                   the folded menu's panel and the window, its three icons inside the chip;
 *                 - the game bar's facts wrap instead of ending in "…", never narrower than their
 *                   widest word, the buttons stay in one row, and the bar's padding is the
 *                   gutter tokens' (0.5rem on a phone, 0.25rem under 400 px).
 * Depends on:     @playwright/test, ./Headers.tsx and ./Showcase.tsx (the fixtures)
 * Source:         new in the kit (Seasonal Cases' planning, 2026-11-25).
 */
import { expect, test, type Page } from '@playwright/test';

// Cases' own rule (its shell.css line 195), which the kit now has in its own form.
const CASES_RULE =
  ".sk-header[data-sk-folded='true'] .sk-header-brand { flex: 1 1 auto; min-width: min-content; }";
const PHONES = [390, 375, 360, 320] as const;
const FONTS = [16, 32] as const; // 100 % and 200 % of the browser's 16 px
const THEMES = ['light', 'dark'] as const;
const label = (font: number): string => `${String(font * 6.25)} % font`;

interface Setting {
  readonly width: number;
  readonly height: number;
  readonly theme: string;
  readonly font?: number;
}

async function open(page: Page, { width, height, theme, font = 16 }: Setting) {
  await page.setViewportSize({ width, height });
  await page.goto(`/?theme=${theme}`);
  await page.addStyleTag({ content: `html { font-size: ${String(font)}px; }` });
  // Boxes measured while a web font is still on its way would move under the test.
  await page.evaluate(() => document.fonts.ready);
}

const casesHeader = (page: Page) => page.getByTestId('cases-header').getByTestId('app-header');

// How many rows the header's items take when it is forced open: the fold's own question.
function rowsWhenOpen(page: Page) {
  return casesHeader(page).evaluate((h) => {
    const was = h.getAttribute('data-sk-folded');
    h.setAttribute('data-sk-folded', 'false');
    const items = [...h.children, ...(h.querySelector('.sk-menu')?.children ?? [])]
      .filter((e) => getComputedStyle(e).display !== 'contents')
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.height > 0);
    const firstBottom = Math.min(...items.map((r) => r.bottom));
    h.setAttribute('data-sk-folded', was ?? 'false');
    return items.some((r) => r.top >= firstBottom - 1) ? 2 : 1;
  });
}

// The brand's and the Menu button's boxes, rounded.
function brandBoxes(page: Page) {
  return casesHeader(page).evaluate((h) => {
    const brand = h.querySelector('.sk-header-brand')?.getBoundingClientRect();
    const menu = h.querySelector('.sk-menu-button')?.getBoundingClientRect();
    return [brand?.width, brand?.height, menu?.left, menu?.top].map((n) => Math.round(n ?? -1));
  });
}

for (const theme of THEMES) {
  for (const [width, height, folded] of [
    [1920, 1080, 'false'],
    [1536, 768, 'true'],
    [1280, 720, 'true'],
  ] as const) {
    const size = `${String(width)}x${String(height)}, ${theme}`;

    test(`Cases' bar folds only where it does not fit: ${size}`, async ({ page }) => {
      await open(page, { width, height, theme });
      await expect(casesHeader(page)).toHaveAttribute('data-sk-folded', folded);
      // A fold here is right: forced open, the items would need a second row.
      expect(await rowsWhenOpen(page)).toBe(folded === 'true' ? 2 : 1);
    });

    test(`Cases' brand rule changes no box: ${size}`, async ({ page }) => {
      await open(page, { width, height, theme });
      const without = await brandBoxes(page);
      await page.addStyleTag({ content: CASES_RULE });
      expect(await brandBoxes(page)).toEqual(without);
    });
  }
}

// The same width gives the same answer however the page got there (v0.27.0): every header of
// the page, loaded fresh, and loaded wide or narrow and then resized.
for (const [width, height] of [
  [1920, 1080],
  [1536, 768],
  [390, 844],
] as const) {
  test(`the fold does not depend on the way to ${String(width)} px`, async ({ page }) => {
    const folds = () =>
      page
        .getByTestId('app-header')
        .evaluateAll((all) => all.map((h) => h.getAttribute('data-sk-folded')));
    await open(page, { width, height, theme: 'light' });
    const fresh = await folds();
    for (const from of [2400, 360]) {
      await open(page, { width: from, height, theme: 'light' });
      await page.setViewportSize({ width, height });
      await expect.poll(folds).toEqual(fresh);
    }
  });
}

// The brand, the Menu button and the toggle, as the folded header lays them out.
function folded(page: Page) {
  return casesHeader(page).evaluate((h) => {
    const box = (selector: string) => h.querySelector(selector)?.getBoundingClientRect();
    const brand = box('.sk-header-brand');
    const name = h.querySelector('.sk-header-brand')?.lastElementChild?.getBoundingClientRect();
    const menu = box('.sk-menu-button');
    const toggle = box('.sk-theme-toggle');
    if (!brand || !name || !menu || !toggle) throw new Error('the header has no brand or controls');
    const meets = (a: DOMRect, b: DOMRect): boolean =>
      a.left < b.right - 0.5 &&
      a.right > b.left + 0.5 &&
      a.top < b.bottom - 0.5 &&
      a.bottom > b.top + 0.5;
    return {
      folded: h.getAttribute('data-sk-folded'),
      brandOverMenu: meets(brand, menu),
      brandOverToggle: meets(brand, toggle),
      nameInsideBrand: name.right <= brand.right + 0.5,
      controlsBelow: menu.top >= brand.bottom - 1,
      controlsBeside: menu.top < brand.bottom - 1 && menu.left >= brand.right - 0.5,
      headerWidth: h.getBoundingClientRect().width,
    };
  });
}

for (const theme of THEMES) {
  for (const font of FONTS) {
    for (const width of PHONES) {
      test(`the brand is never under the Menu: ${String(width)} px, ${label(font)}, ${theme}`, async ({
        page,
      }) => {
        await open(page, { width, height: 800, theme, font });
        const seen = await folded(page);
        expect(seen.folded).toBe('true');
        expect(seen.brandOverMenu, 'the brand and the Menu button share no pixel').toBe(false);
        expect(seen.brandOverToggle, 'nor the brand and the toggle').toBe(false);
        expect(seen.nameInsideBrand, 'the name stays inside the brand').toBe(true);
        // Beside it when they fit one row, else the controls take a row of their own below.
        expect(seen.controlsBelow || seen.controlsBeside).toBe(true);
        expect(seen.headerWidth, 'the header is no wider than the window').toBeLessThanOrEqual(
          width + 0.5,
        );
      });
    }
  }
}

// The longest chip's box, the folded menu's panel and the icons, as laid out.
function chipOf(page: Page) {
  return page
    .getByTestId('cases-long-header')
    .getByTestId('app-header')
    .evaluate((h) => {
      const chip = h.querySelector('.sk-header-chip');
      const menu = h.querySelector('.sk-menu')?.getBoundingClientRect();
      if (!chip || !menu) throw new Error('no chip or menu');
      const images = [...chip.querySelectorAll('img')].map((i) => ({
        ok: i.complete && i.naturalWidth > 0,
        left: i.getBoundingClientRect().left,
        right: i.getBoundingClientRect().right,
      }));
      const box = chip.getBoundingClientRect();
      return { left: box.left, right: box.right, menu, images, text: chip.textContent };
    });
}

for (const theme of THEMES) {
  for (const font of FONTS) {
    for (const width of PHONES) {
      test(`the 24-character chip fits the folded menu: ${String(width)} px, ${label(font)}, ${theme}`, async ({
        page,
      }) => {
        await open(page, { width, height: 800, theme, font });
        await page.getByTestId('cases-long-header').getByTestId('menu-button').click();
        const seen = await chipOf(page);
        expect(seen.text).toContain('Maximilian-Alexander Ros');
        expect(seen.left).toBeGreaterThanOrEqual(seen.menu.left);
        expect(seen.right, 'inside the menu panel').toBeLessThanOrEqual(seen.menu.right);
        expect(seen.menu.width, 'the panel is no wider than the window').toBeLessThanOrEqual(
          width + 0.5,
        );
        expect(seen.images).toHaveLength(3);
        for (const image of seen.images) {
          expect(image.ok).toBe(true);
          expect(image.left).toBeGreaterThanOrEqual(seen.left);
          expect(image.right).toBeLessThanOrEqual(seen.right);
        }
      });
    }
  }
}

// The bar's facts, buttons and padding, and the widest word each fact holds.
function organiser(page: Page) {
  return page
    .getByTestId('organiser-bar')
    .getByTestId('game-bar')
    .evaluate((bar) => {
      const box = bar.getBoundingClientRect();
      const facts = [...bar.querySelectorAll<HTMLElement>('.sk-bar-fact')].map((f) => {
        const style = getComputedStyle(f);
        // The widest word, laid out in the fact's own font.
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font};`;
        f.append(probe);
        const widest = Math.max(
          ...f.textContent.split(/\s+/).map((word) => {
            probe.textContent = word;
            return probe.getBoundingClientRect().width;
          }),
        );
        probe.remove();
        const width = f.getBoundingClientRect().width;
        return {
          clipped: f.scrollWidth > f.clientWidth + 1,
          overflow: style.textOverflow,
          widest,
          width,
        };
      });
      const buttons = [...bar.querySelectorAll('.sk-bar-button')].map((b) =>
        b.getBoundingClientRect(),
      );
      return {
        barWidth: box.width,
        right: box.right,
        pad: parseFloat(getComputedStyle(bar).paddingLeft),
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
        facts,
        rows: new Set(buttons.map((b) => Math.round(b.top))).size,
        lastRight: Math.max(...buttons.map((b) => b.right)),
      };
    });
}

for (const theme of THEMES) {
  for (const font of FONTS) {
    for (const width of PHONES) {
      test(`the bar's facts wrap and its buttons keep a row: ${String(width)} px, ${label(font)}, ${theme}`, async ({
        page,
      }) => {
        await open(page, { width, height: 800, theme, font });
        const seen = await organiser(page);
        expect(seen.barWidth, 'the bar is as wide as the window').toBeLessThanOrEqual(width + 0.5);
        for (const fact of seen.facts) {
          expect(fact.clipped, 'no fact is cut off').toBe(false);
          expect(fact.overflow).not.toBe('ellipsis');
          expect(fact.width, 'never narrower than its widest word').toBeGreaterThanOrEqual(
            fact.widest - 0.5,
          );
        }
        expect(seen.rows, 'six buttons, one row').toBe(1);
        expect(seen.lastRight, 'the last button ends inside the bar').toBeLessThanOrEqual(
          seen.right,
        );
        // The gutter tokens: 0.5rem on a phone, half of it at 400 px and under.
        expect(seen.pad).toBeCloseTo(seen.rootPx * (width <= 400 ? 0.25 : 0.5), 0);
      });
    }
  }
}
