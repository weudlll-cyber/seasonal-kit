/**
 * @file   src/testing/probeRules.ts
 * @brief  The probe's rules: boxes past the window, cut text, overlapping controls.
 *
 * Responsibility: in-page functions ./probe runs, each given ./probeBase's helpers (`b`):
 *                 - `wideBoxes`: the outermost boxes reaching past the window's sides outside any
 *                   scrolling box; `edgeBoxes` (since v0.36.0) the same past the top of the page,
 *                   and past the bottom where nothing scrolls to it (a page that does not
 *                   scroll, or a fixed box);
 *                 - `isCut`: text a hard clip or an ellipsis hides, but for the kit's own
 *                   intended ellipses, listed in `kitEllipses` alone (since v0.36.0), whose
 *                   insides the two rules above leave out as well (since v0.39.0: v0.36.0 told
 *                   only this one, so the chat bar's words were still reported outside);
 *                 - `overlaps` (since v0.36.0): a control in the page's flow lying over, or
 *                   under, a part beside it or beside one of its boxes. Boxes placed out of the
 *                   flow (menus, sheets, badges) are meant to lie over others and are left out,
 *                   and since v0.39.0 so is what a game declares (a grid item in a free cell, a
 *                   sheet laid over a grid);
 *                 - `wholeItems` (since v0.38.0): how many of a selector's elements are wholly in
 *                   sight, in the window and in every box around them, and (since v0.40.0)
 *                   covered by nothing: no part painted over a corner or the middle, and no
 *                   sticky `::before` or `::after` of a scrolling box over them. A part that
 *                   takes no pointer (`pointer-events: none`) is not seen as covering, but for
 *                   those sticky ones.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         `wideBoxes` and `isCut` moved from ./probe.ts (v0.36.0); the rest new in the
 *                 kit (findings of Mini Games, Cases and Bingo at v0.34.0). The small controls are
 *                 ./probeTargets since v0.39.0.
 */
import type { Base, Rect } from './probeBase.js';
export interface Meant {
    readonly control: string;
    readonly over: string;
}
export declare function kitEllipses(): string;
export declare function isCut(b: Base, el: Element, boxes: Rect[]): boolean;
export declare function outermost(b: Base, past: (el: Element, r: DOMRect) => string | null): string[];
export declare function wideBoxes(b: Base, width: number): string[];
export declare function edgeBoxes(b: Base, height: number): string[];
export declare function inFlow(el: Element): boolean;
export declare function crosses(b: Base, one: Rect, two: Rect): boolean;
export declare function isMeant(meant: readonly Meant[], control: Element, other: Element): boolean;
export declare function overlapOf(b: Base, control: Element, meant: readonly Meant[]): Element | null;
export declare function overlaps(b: Base, meant: readonly Meant[]): string[];
export declare function stickyStrip(b: Base, box: Element, pseudo: string): Rect | null;
export declare function underSign(b: Base, el: Element, seen: Rect): boolean;
export declare function paintedOver(el: Element, box: Rect): boolean;
export declare function wholeItems(b: Base, selector: string): number;
export declare const RULES: {
    kitEllipses: typeof kitEllipses;
    isCut: typeof isCut;
    outermost: typeof outermost;
    wideBoxes: typeof wideBoxes;
    edgeBoxes: typeof edgeBoxes;
    inFlow: typeof inFlow;
    crosses: typeof crosses;
    isMeant: typeof isMeant;
    overlapOf: typeof overlapOf;
    overlaps: typeof overlaps;
    stickyStrip: typeof stickyStrip;
    underSign: typeof underSign;
    paintedOver: typeof paintedOver;
    wholeItems: typeof wholeItems;
};
export type Rules = typeof RULES;
