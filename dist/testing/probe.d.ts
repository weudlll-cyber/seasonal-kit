/**
 * @file   src/testing/probe.ts
 * @brief  One in-page measurement of a screen: overflow, cut text, small and overlapping
 *         controls, a fitted root whose content does not fit it.
 *
 * Responsibility: `probe(page)` runs in the browser and returns what is wrong with the screen as
 *                 it is now (an overlap declared in `meant`, with a decision number, is not wrong;
 *                 one without a number is refused, since v0.39.0):
 *                 - `hScroll`: the page scrolls sideways;
 *                 - `outside`: the outermost boxes reaching past the window's sides, and (since
 *                   v0.36.0) past its top, or past its bottom where nothing scrolls to them;
 *                 - `cut`: visible text an ancestor's `overflow: hidden` or `clip` cuts, or an
 *                   ellipsis hides (the kit's own intended ones apart, since v0.36.0);
 *                 - `smallTargets`: a control (link, button, field, summary, button role) under
 *                   `targetPx` (44) in either direction. A link inside running text is exempt, as
 *                   WCAG 2.5.8 exempts it; a checkbox or radio in a label is measured by the
 *                   label; a link or button in a `.sk-dense-list` passes at 24 px with room around it
 *                   (since v0.36.0, K112);
 *                 - `overlaps` (since v0.36.0): a control lying over or under a part beside it;
 *                 - `clippedFits`: a fitted root (`[data-sk-fit-scale]`, ../fit.ts) with a part
 *                   outside its padding box, where it is cut: even at its floor it does not fit
 *                   (a root that scrolls hides nothing, since v0.36.0).
 *                 Hidden elements and text only for screen readers (a 1 px box) are left out. A
 *                 finding about an element of which nothing is in the window and unclipped ends
 *                 with " (not visible)" (since v0.39.0).
 *                 `wholeCount(page, selector)` (since v0.38.0) counts the elements wholly in
 *                 sight, for the sweep's floors (./sweepFloors).
 *                 The in-page functions (./probeBase, ./probeRules, ./probeTargets and those
 *                 below) are put into the page as source text and call each other by name.
 * Depends on:     ./decision, ./probeBase, ./probeRules, ./probeTargets;
 *                 @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/fitProbe.ts at 8d20904 (`clipsOf`,
 *                 `readable`, the text fragments, `cutText`, `wideBoxes`, the injection).
 *                 Generalised: touch targets and fitted roots added; its text floor and card
 *                 cells stay in the game.
 */
import type { Page } from '@playwright/test';
import { type Base } from './probeBase.js';
import { type Meant, type Rules } from './probeRules.js';
import { type Targets } from './probeTargets.js';
export interface Probe {
    readonly hScroll: boolean;
    readonly outside: readonly string[];
    readonly cut: readonly string[];
    readonly smallTargets: readonly string[];
    readonly overlaps: readonly string[];
    readonly clippedFits: readonly string[];
}
export interface IntendedOverlap extends Meant {
    readonly decision: string;
}
export declare function runProbe(targetPx: number, b?: Base, r?: Rules & Targets, meant?: readonly Meant[]): Probe;
export declare function probe(page: Page, targetPx?: number, meant?: readonly IntendedOverlap[]): Promise<Probe>;
export declare function wholeCount(page: Page, selector: string): Promise<number>;
