/**
 * @file   src/testing/probeTargets.ts
 * @brief  The probe's rule for small controls, and the one place a smaller one passes.
 *
 * Responsibility: `smallTargets` is a control under the least size (a link in running text is
 *                 exempt; a checkbox or radio in a label is measured by the label). `denseEnough`:
 *                 a link in a dense list (`.sk-dense-list`, K112) passes at 24 px with 4 px clear
 *                 of every other control seen at the same time, and nowhere else. A control hidden
 *                 or scrolled out of view is no neighbour (since v0.39.0), nor is one past the
 *                 window's edge from it.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         ./probeRules, moved here (v0.39.0); the neighbours' fix from Bingo Royale's
 *                 report on v0.38.0.
 */
import type { Base } from './probeBase.js';
export declare function seenTogether(b: Base, one: Element, other: Element): boolean;
export declare function denseEnough(b: Base, el: Element, r: DOMRect): boolean;
export declare function smallTargets(b: Base, least: number): string[];
export declare const TARGETS: {
    seenTogether: typeof seenTogether;
    denseEnough: typeof denseEnough;
    smallTargets: typeof smallTargets;
};
export type Targets = typeof TARGETS;
