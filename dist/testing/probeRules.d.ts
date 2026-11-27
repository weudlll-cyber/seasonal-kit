/**
 * @file   src/testing/probeRules.ts
 * @brief  The probe's rules: boxes past the window, cut text, small and overlapping controls.
 *
 * Responsibility: in-page functions ./probe runs, each given ./probeBase's helpers (`b`):
 *                 - `wideBoxes`: the outermost boxes reaching past the window's sides outside any
 *                   scrolling box; `edgeBoxes` (since v0.36.0) the same past the top of the page,
 *                   and past the bottom where nothing scrolls to it (a page that does not
 *                   scroll, or a fixed box);
 *                 - `isCut`: text a hard clip or an ellipsis hides, but for the kit's own
 *                   intended ellipses, listed in `kitEllipses` alone (since v0.36.0);
 *                 - `smallTargets`: a control under the least size. A link in a dense list
 *                   (`.sk-dense-list`, since v0.36.0, K112) passes at 24 px with 4 px clear of
 *                   every other control; nowhere else;
 *                 - `overlaps` (since v0.36.0): a control in the page's flow lying over, or
 *                   under, a part beside it or beside one of its boxes. Boxes placed out of the
 *                   flow (menus, sheets, badges) are meant to lie over others and are left out;
 *                 - `wholeItems` (since v0.38.0): how many of a selector's elements are wholly in
 *                   sight, in the window and in every box around them.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         `wideBoxes`, `isCut` and `smallTargets` moved from ./probe.ts (v0.36.0); the
 *                 rest new in the kit (findings of Mini Games, Cases and Bingo at v0.34.0).
 */
import type { Base, Rect } from './probeBase.js';
export declare function kitEllipses(): string;
export declare function controls(): Element[];
export declare function isCut(b: Base, el: Element, boxes: Rect[]): boolean;
export declare function outermost(b: Base, past: (el: Element, r: DOMRect) => string | null): string[];
export declare function wideBoxes(b: Base, width: number): string[];
export declare function edgeBoxes(b: Base, height: number): string[];
export declare function denseEnough(b: Base, el: Element, r: DOMRect): boolean;
export declare function smallTargets(b: Base, least: number): string[];
export declare function inFlow(el: Element): boolean;
export declare function seenBox(b: Base, el: Element): Rect;
export declare function crosses(b: Base, one: Rect, two: Rect): boolean;
export declare function overlapOf(b: Base, control: Element): Element | null;
export declare function overlaps(b: Base): string[];
export declare function wholeItems(b: Base, selector: string): number;
export declare const RULES: {
    kitEllipses: typeof kitEllipses;
    controls: typeof controls;
    isCut: typeof isCut;
    outermost: typeof outermost;
    wideBoxes: typeof wideBoxes;
    edgeBoxes: typeof edgeBoxes;
    denseEnough: typeof denseEnough;
    smallTargets: typeof smallTargets;
    inFlow: typeof inFlow;
    seenBox: typeof seenBox;
    crosses: typeof crosses;
    overlapOf: typeof overlapOf;
    overlaps: typeof overlaps;
    wholeItems: typeof wholeItems;
};
export type Rules = typeof RULES;
