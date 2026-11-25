/**
 * @file   src/testing/probe.ts
 * @brief  One in-page measurement of a screen: overflow, cut text, small controls, a fitted root
 *         whose content does not fit it.
 *
 * Responsibility: `probe(page)` runs in the browser and returns what is wrong with the screen as
 *                 it is now:
 *                 - `hScroll`: the page scrolls sideways;
 *                 - `outside`: the outermost boxes reaching past the window's sides outside any
 *                   scrolling box;
 *                 - `cut`: visible text an ancestor's `overflow: hidden` or `clip` cuts, or an
 *                   ellipsis hides;
 *                 - `smallTargets`: a control (link, button, field, summary, button role) under
 *                   `targetPx` (44) in either direction. A link inside running text is exempt, as
 *                   WCAG 2.5.8 exempts it; a checkbox or radio in a label is measured by the label;
 *                 - `clippedFits`: a fitted root (`[data-sk-fit-scale]`, ../fit.ts) with a part
 *                   outside its padding box, where it is cut: even at its floor it does not fit.
 *                 Hidden elements and text only for screen readers (a 1 px box) are left out.
 *                 The functions below are put into the page as source text and call each other by
 *                 name, so they use nothing else from this file and nothing imported.
 * Depends on:     @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/fitProbe.ts at 8d20904 (`clipsOf`,
 *                 `readable`, the text fragments, `cutText`, `wideBoxes`, the injection).
 *                 Generalised: touch targets and fitted roots added; its text floor, card cells and
 *                 overlap check stay in the game.
 */
import type { Page } from '@playwright/test';
export interface Probe {
    readonly hScroll: boolean;
    readonly outside: readonly string[];
    readonly cut: readonly string[];
    readonly smallTargets: readonly string[];
    readonly clippedFits: readonly string[];
}
export declare function runProbe(targetPx: number): Probe;
export declare function probe(page: Page, targetPx?: number): Promise<Probe>;
