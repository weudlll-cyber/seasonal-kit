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
 *                 the finding), which the report then leaves out. Since v0.36.0 a screen whose
 *                 `open` fails is reported as a finding and the walk goes on, finite animations
 *                 and transitions end before the screen is probed, and `axeFinder` takes
 *                 selectors to leave out.
 * Depends on:     ./probe, ./screens; @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/websiteSweep.ts and the size x font loop
 *                 pasted into its e2e specs, at 8d20904 (e.g. adminAccounts.spec.ts `expectFits`);
 *                 seasonal-mini-games e2e/access.spec.ts at 9e3c6f3 (the axe tags).
 */
import type { Page } from '@playwright/test';
import { type Size, type Theme } from './screens.js';
export type AxeFinder = (page: Page) => Promise<readonly string[]>;
export interface SweepScreen {
    readonly name: string;
    readonly open: (page: Page) => Promise<void>;
    readonly allow?: readonly string[];
}
export interface SweepOptions {
    readonly axe: AxeFinder | false;
    readonly sizes?: readonly Size[];
    readonly fonts?: readonly number[];
    readonly themes?: readonly Theme[];
    readonly targetPx?: number;
}
interface AxeLike {
    withTags: (tags: string[]) => AxeLike;
    exclude: (selector: string) => AxeLike;
    analyze: () => Promise<{
        violations: {
            id: string;
            nodes: {
                target: unknown[];
            }[];
        }[];
    }>;
}
export interface AxeFinderOptions {
    readonly exclude?: readonly string[];
}
export declare function axeFinder(builder: new (input: {
    page: Page;
}) => AxeLike, options?: AxeFinderOptions): AxeFinder;
export declare function sweep(page: Page, screens: readonly SweepScreen[], options: SweepOptions): Promise<number>;
export {};
