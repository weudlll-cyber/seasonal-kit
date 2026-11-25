/**
 * @file   showcase/steps.spec.ts
 * @brief  A member's step badges in the header's account chip, measured (v0.19.0), and the
 *         longest chip on the narrowest phones (night audit 2026-11-25, piece 6).
 *
 * Responsibility: at the sizes layout.spec.ts already uses (1280, 1536, 1920 and 390 px), in light
 *                 and dark, the showcase's header with three steps shows three loaded icons, each
 *                 named by its step, 20 px (1.25rem) square, inside the chip and the window, with
 *                 no sideways scroll. At 320, 360 and 375 px the header with the longest chip (a
 *                 long name, a two-word role, three steps) does the same, and its chip ends
 *                 inside the folded menu's own panel. Where the header folds (the phone), the
 *                 icons are measured in the opened menu, beside the name. The one-row rule for
 *                 every header is layout.spec.ts's; axe over these headers in both themes is
 *                 showcase.spec.ts's. A name in a board's row and in a lower third shows the same
 *                 20 px badges (v0.24.0, K68).
 * Depends on:     @playwright/test
 * Source:         new in the kit.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const NAMES = ['Diamond holder', 'Golden farmer', 'Early investor'];
// 1.25rem at the browser's 16 px default.
const ICON_PX = 20;

async function openChip(page: Page, width: number, theme: string, testId: string) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`/?theme=${theme}`);
  const header = page.getByTestId(testId).getByTestId('app-header');
  // Folded (a phone): the chip sits in the menu, which opens first.
  if ((await header.getAttribute('data-sk-folded')) === 'true') {
    await header.getByTestId('menu-button').click();
  }
  return header.getByTestId('signed-in-as');
}

// The chip's box, its icons' boxes, and how wide the page is, as the browser lays them out.
function measure(chip: Locator) {
  return chip.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const menu = el.closest('.sk-menu')?.getBoundingClientRect();
    return {
      chipRight: box.right,
      chipLeft: box.left,
      menuRight: menu?.right ?? null,
      scrollWidth: document.documentElement.scrollWidth,
      images: [...el.querySelectorAll('img')].map((img) => {
        const r = img.getBoundingClientRect();
        return {
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          width: r.width,
          height: r.height,
          left: r.left,
          right: r.right,
        };
      }),
    };
  });
}

type Seen = Awaited<ReturnType<typeof measure>>;

function expectFits(seen: Seen, width: number): void {
  expect(seen.images.map((i) => i.alt)).toEqual(NAMES);
  for (const image of seen.images) {
    expect(image.loaded, `${image.alt} is loaded`).toBe(true);
    expect(image.width).toBeCloseTo(ICON_PX, 0);
    expect(image.height).toBeCloseTo(ICON_PX, 0);
    expect(image.left, 'inside the chip').toBeGreaterThanOrEqual(seen.chipLeft);
    expect(image.right, 'inside the chip').toBeLessThanOrEqual(seen.chipRight);
  }
  expect(seen.chipRight, 'the chip ends inside the window').toBeLessThanOrEqual(width);
  expect(seen.scrollWidth, 'no sideways scroll').toBeLessThanOrEqual(width);
}

for (const theme of ['light', 'dark']) {
  for (const width of [1280, 1536, 1920, 390]) {
    test(`the step badges sit beside the name at ${String(width)} px, ${theme}`, async ({
      page,
    }) => {
      const chip = await openChip(page, width, theme, 'steps-header');
      expectFits(await measure(chip), width);
    });
  }

  for (const width of [320, 360, 375]) {
    test(`the longest chip fits the folded menu at ${String(width)} px, ${theme}`, async ({
      page,
    }) => {
      const chip = await openChip(page, width, theme, 'steps-long-header');
      const seen = await measure(chip);
      expectFits(seen, width);
      // A folded menu holds the chip: it must not run past the panel's right edge.
      if (seen.menuRight !== null) expect(seen.chipRight).toBeLessThanOrEqual(seen.menuRight);
    });
  }
}

// Away from the header (K68): a board's row and a lower third show the same badges.
for (const width of [1280, 360]) {
  test(`a name in a list shows the same badges at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?theme=light');
    for (const place of ['step-board', 'step-lower-third']) {
      const badges = page.getByTestId(place).getByRole('img');
      await expect(badges.first()).toBeVisible();
      for (const image of await badges.all()) {
        const box = await image.boundingBox();
        expect(box?.width, place).toBeCloseTo(ICON_PX, 0);
        expect(box?.height, place).toBeCloseTo(ICON_PX, 0);
        expect((box?.x ?? width) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      }
    }
    await expect(page.getByTestId('step-board').getByTestId('steps')).toHaveCount(1);
  });
}
