/**
 * @file   src/testing/probeBase.ts
 * @brief  The probe's shared in-page helpers: names, boxes, what is clipped and what is seen.
 *
 * Responsibility: `nameOf` names an element for a report; `meet` is two boxes' common part;
 *                 `clipsOf` what the ancestors let be seen (the scrolling boxes, and the hard
 *                 clips: hidden or clip); `shown` whether a reader sees it (visible, and no 1 px
 *                 box for screen readers only); `textBoxes` the boxes of an element's own text;
 *                 `inText` WCAG 2.5.8's inline exception. ./probe puts these functions into the
 *                 page as source text, where they call each other by name, so they use nothing
 *                 imported; ./probeRules gets them as the object `BASE`, since a test's or
 *                 Playwright's own build renames imported names inside a function's source.
 * Source:         ./probe.ts, moved here unchanged (v0.36.0); from seasonal-bingo-royale
 *                 e2e/acceptance/fitProbe.ts at 8d20904.
 */
export interface Rect {
    top: number;
    left: number;
    bottom: number;
    right: number;
}
export declare function nameOf(el: Element): string;
export declare function meet(a: Rect, b: Rect): Rect;
export declare function clipsOf(el: Element): {
    scroll: Rect;
    hard: Rect;
    scrolls: boolean;
};
export declare function shown(el: Element): boolean;
export declare function textBoxes(el: Element): Rect[];
export declare function inText(el: Element): boolean;
export declare const BASE: {
    nameOf: typeof nameOf;
    meet: typeof meet;
    clipsOf: typeof clipsOf;
    shown: typeof shown;
    textBoxes: typeof textBoxes;
    inText: typeof inText;
};
export type Base = typeof BASE;
