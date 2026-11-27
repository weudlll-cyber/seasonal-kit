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
 *                 `@axe-core/playwright` runs the WCAG 2 A and AA rules and the landmark rules; `false` turns it off, by
 *                 name. A screen may exempt a finding it knows with `allow` (a text that is part of
 *                 the finding), which the report then leaves out. Since v0.36.0 a screen whose
 *                 `open` fails is reported as a finding and the walk goes on, finite animations
 *                 and transitions end before the screen is probed (./sweepMotion; what still
 *                 moves at its limit is a finding), and `axeFinder` takes
 *                 selectors to leave out. Since v0.38.0 a screen may have a `setup`, run once
 *                 before its looks (a fresh sign-in, say, where many looks would pass a server's
 *                 request limit), and `floors`: at least so many items wholly in sight.
 * Depends on:     ./probe, ./screens, ./sweepFloors, ./sweepMotion; @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/websiteSweep.ts and the size x font loop
 *                 pasted into its e2e specs, at 8d20904 (e.g. adminAccounts.spec.ts `expectFits`);
 *                 seasonal-mini-games e2e/access.spec.ts at 9e3c6f3 (the axe tags).
 */
import type { Page } from '@playwright/test';

import { probe, type IntendedOverlap, type Probe } from './probe.js';
import { notVisible } from './probeBase.js';
import { setTheme, SWEEP_SIZES, type Size, type Theme } from './screens.js';
import { floorLines, uncheckedFloor, type VisibleFloor } from './sweepFloors.js';
import { MOTION_LIMIT_MS, motionEnded } from './sweepMotion.js';

export type AxeFinder = (page: Page) => Promise<readonly string[]>;

// A finding a screen accepts: a part of its text, or such a part only where nothing of the
// element can be seen (since v0.39.0): the same finding on a visible one is still reported.
export type Allowed = string | { readonly finding: string; readonly onlyNotVisible: true };

export interface SweepScreen {
  readonly name: string;
  readonly open: (page: Page) => Promise<void>;
  // Runs once before the screen's first look. Where it fails, the screen is not looked at.
  readonly setup?: (page: Page) => Promise<void>;
  readonly floors?: readonly VisibleFloor[];
  // Overlaps an owner decided on, each with its decision's number.
  readonly intendedOverlaps?: readonly IntendedOverlap[];
  // Findings this screen is known to have and accepts.
  readonly allow?: readonly Allowed[];
}

export interface SweepOptions {
  readonly axe: AxeFinder | false;
  readonly sizes?: readonly Size[];
  readonly fonts?: readonly number[];
  readonly themes?: readonly Theme[];
  // The least width and height of a control, in px. Default 44.
  readonly targetPx?: number;
}

// What axe checks in a sweep: the WCAG 2.0 to 2.2 A and AA rules, and the two rules about
// landmarks that the docked screen is held to in the kit's own browser check (since v0.39.0).
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
export const AXE_LANDMARK_RULES = ['region', 'landmark-main-is-top-level'];

// The shape of `@axe-core/playwright`'s builder that is used here.
interface AxeLike {
  // A method, so a builder whose options are typed more narrowly fits.
  options(run: {
    runOnly: { type: 'tag'; values: string[] };
    rules: Record<string, { enabled: boolean }>;
  }): AxeLike;
  exclude: (selector: string) => AxeLike;
  analyze: () => Promise<{
    violations: { id: string; nodes: { target: unknown[] }[] }[];
  }>;
}

export interface AxeFinderOptions {
  // Selectors axe does not look into, e.g. the website's chat frame (since v0.36.0).
  readonly exclude?: readonly string[];
}

export function axeFinder(
  builder: new (input: { page: Page }) => AxeLike,
  options: AxeFinderOptions = {},
): AxeFinder {
  return async (page) => {
    const tagged = new builder({ page }).options({
      runOnly: { type: 'tag', values: AXE_TAGS },
      rules: Object.fromEntries(AXE_LANDMARK_RULES.map((id) => [id, { enabled: true }])),
    });
    const result = await (options.exclude ?? [])
      .reduce((axe, selector) => axe.exclude(selector), tagged)
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
    ...named('overlapping control', seen.overlaps),
    ...named('clipped fitted root', seen.clippedFits),
  ];
}

interface Look {
  readonly size: Size;
  readonly font: number;
  readonly theme: Theme;
}

// An error's first line: the rest is a call log or a stack.
const firstLine = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).split('\n')[0] ?? '';

function allows(known: Allowed, line: string): boolean {
  if (typeof known === 'string') return line.includes(known);
  return line.includes(known.finding) && line.endsWith(notVisible());
}

// One screen in one look: opened afresh, so a layout that measures on load sees the real size.
async function findingsOf(
  page: Page,
  screen: SweepScreen,
  look: Look,
  options: SweepOptions,
): Promise<string[]> {
  await page.setViewportSize(look.size);
  const where = `${screen.name} ${String(look.size.width)}x${String(look.size.height)} ${String(look.font)}px ${look.theme}`;
  // A screen that does not open is a finding of its own; the others are still seen.
  try {
    await screen.open(page);
  } catch (error) {
    return [`${where}: did not open: ${firstLine(error)}`];
  }
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
  const moving = await motionEnded(page);
  const found = [
    ...(typeof moving === 'string'
      ? [`still moving after ${String(MOTION_LIMIT_MS / 1000)} s: ${moving}`]
      : []),
    ...linesOf(await probe(page, options.targetPx, screen.intendedOverlaps)),
    ...(await floorLines(page, screen.floors ?? [], look)),
    ...(options.axe === false ? [] : (await options.axe(page)).map((v) => `axe: ${v}`)),
  ];
  return found
    .filter((line) => !(screen.allow ?? []).some((known) => allows(known, line)))
    .map((line) => `${where}: ${line}`);
}

function looksOf(options: SweepOptions): Look[] {
  return (options.sizes ?? SWEEP_SIZES).flatMap((size) =>
    (options.fonts ?? [16, 32]).flatMap((font) =>
      (options.themes ?? (['light', 'dark'] as const)).map((theme) => ({ size, font, theme })),
    ),
  );
}

// Every look of one screen, after its setup.
async function screenFindings(
  page: Page,
  screen: SweepScreen,
  looks: readonly Look[],
  options: SweepOptions,
): Promise<string[]> {
  try {
    await screen.setup?.(page);
  } catch (error) {
    return [`${screen.name}: its setup failed: ${firstLine(error)}`];
  }
  const findings: string[] = [];
  for (const look of looks) findings.push(...(await findingsOf(page, screen, look, options)));
  return findings;
}

// A floor that no look checks would pass for ever, like a sweep with nothing to see.
function refuseUnchecked(screens: readonly SweepScreen[], looks: readonly Look[]): void {
  for (const screen of screens) {
    const floor = uncheckedFloor(screen.floors ?? [], looks);
    if (floor === undefined) continue;
    throw new Error(
      `${screen.name}’s floor "${floor.selector}" (${floor.decision}) is checked at no look`,
    );
  }
}

export async function sweep(
  page: Page,
  screens: readonly SweepScreen[],
  options: SweepOptions,
): Promise<number> {
  const looks = looksOf(options);
  // Nothing to look at would pass every time.
  if (screens.length === 0 || looks.length === 0) throw new Error('the sweep has nothing to see');
  refuseUnchecked(screens, looks);
  const findings: string[] = [];
  for (const screen of screens) {
    findings.push(...(await screenFindings(page, screen, looks, options)));
  }
  if (findings.length > 0) {
    throw new Error(`the sweep found ${String(findings.length)}:\n${findings.join('\n')}`);
  }
  return screens.length * looks.length;
}
