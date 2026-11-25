/**
 * @file   src/testing/sweep.ts
 * @brief  A game's screens at every size, in light and dark, at 100 % and 200 % root font: one
 *         call that fails with everything it found.
 *
 * Responsibility: `sweep(page, screens, options)` walks each named screen through the sizes (default
 *                 ./screens `SWEEP_SIZES`), the root fonts (16 and 32 px) and both themes: it sets
 *                 the window, lets the screen open itself (`open`, which navigates and waits for
 *                 what it needs), sets the root font and the theme, waits for two frames, probes
 *                 (./probe) and runs `axe`. It throws one error listing every finding with its
 *                 screen, size, font and theme, and returns how many combinations it saw. `axe` is
 *                 the game's own (so the kit depends on nothing): `axeFinder(AxeBuilder)` from
 *                 `@axe-core/playwright` runs the WCAG 2 A and AA rules; `false` turns it off, by
 *                 name. A screen may exempt a finding it knows with `allow` (a text that is part of
 *                 the finding), which the report then leaves out.
 * Depends on:     ./probe, ./screens; @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/websiteSweep.ts and the size x font loop
 *                 pasted into its e2e specs, at 8d20904 (e.g. adminAccounts.spec.ts `expectFits`);
 *                 seasonal-mini-games e2e/access.spec.ts at 9e3c6f3 (the axe tags).
 */
import type { Page } from '@playwright/test';

import { probe, type Probe } from './probe.js';
import { setTheme, SWEEP_SIZES, type Size, type Theme } from './screens.js';

export type AxeFinder = (page: Page) => Promise<readonly string[]>;

export interface SweepScreen {
  readonly name: string;
  readonly open: (page: Page) => Promise<void>;
  // Findings this screen is known to have and accepts: parts of their text.
  readonly allow?: readonly string[];
}

export interface SweepOptions {
  readonly axe: AxeFinder | false;
  readonly sizes?: readonly Size[];
  readonly fonts?: readonly number[];
  readonly themes?: readonly Theme[];
  // The least width and height of a control, in px. Default 44.
  readonly targetPx?: number;
}

// The shape of `@axe-core/playwright`'s builder that is used here.
interface AxeLike {
  withTags: (tags: string[]) => AxeLike;
  analyze: () => Promise<{
    violations: { id: string; nodes: { target: unknown[] }[] }[];
  }>;
}

export function axeFinder(builder: new (input: { page: Page }) => AxeLike): AxeFinder {
  return async (page) => {
    const result = await new builder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.map(String).join(' ')).join(', ')}`,
    );
  };
}

// The probe's answer as report lines.
function linesOf(seen: Probe): string[] {
  const named = (label: string, list: readonly string[]): string[] =>
    list.map((item) => `${label}: ${item}`);
  return [
    ...(seen.hScroll ? ['the page scrolls sideways'] : []),
    ...named('outside the window', seen.outside),
    ...named('cut text', seen.cut),
    ...named('small control', seen.smallTargets),
    ...named('clipped fitted root', seen.clippedFits),
  ];
}

interface Look {
  readonly size: Size;
  readonly font: number;
  readonly theme: Theme;
}

// One screen in one look: opened afresh, so a layout that measures on load sees the real size.
async function findingsOf(
  page: Page,
  screen: SweepScreen,
  look: Look,
  options: SweepOptions,
): Promise<string[]> {
  await page.setViewportSize(look.size);
  await screen.open(page);
  await page.evaluate((px) => {
    document.documentElement.style.fontSize = `${String(px)}px`;
  }, look.font);
  await setTheme(page, look.theme);
  // A pixel off the height and back: parts that measure on a resize (the fitted screens) measure
  // again with the new font.
  await page.setViewportSize({ ...look.size, height: look.size.height - 1 });
  await page.setViewportSize(look.size);
  // Two frames: resize observers have run and their layout is painted.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  const found = [
    ...linesOf(await probe(page, options.targetPx)),
    ...(options.axe === false ? [] : (await options.axe(page)).map((v) => `axe: ${v}`)),
  ];
  const where = `${screen.name} ${String(look.size.width)}x${String(look.size.height)} ${String(look.font)}px ${look.theme}`;
  return found
    .filter((line) => !(screen.allow ?? []).some((known) => line.includes(known)))
    .map((line) => `${where}: ${line}`);
}

function looksOf(options: SweepOptions): Look[] {
  return (options.sizes ?? SWEEP_SIZES).flatMap((size) =>
    (options.fonts ?? [16, 32]).flatMap((font) =>
      (options.themes ?? (['light', 'dark'] as const)).map((theme) => ({ size, font, theme })),
    ),
  );
}

export async function sweep(
  page: Page,
  screens: readonly SweepScreen[],
  options: SweepOptions,
): Promise<number> {
  const looks = looksOf(options);
  // Nothing to look at would pass every time.
  if (screens.length === 0 || looks.length === 0) throw new Error('the sweep has nothing to see');
  const findings: string[] = [];
  for (const screen of screens) {
    for (const look of looks) {
      findings.push(...(await findingsOf(page, screen, look, options)));
    }
  }
  if (findings.length > 0) {
    throw new Error(`the sweep found ${String(findings.length)}:\n${findings.join('\n')}`);
  }
  return screens.length * looks.length;
}
