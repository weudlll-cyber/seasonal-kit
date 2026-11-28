/**
 * @file   src/testing/probeText.ts
 * @brief  The probe's rule on text sizes: every visible text has one of the kit's four sizes.
 *
 * Responsibility: in-page functions ./probe runs, given ./probeBase's helpers (`b`).
 *                 `offScaleText` names each visible element whose own text is set in none of
 *                 `--sk-font-size-small`, `-body`, `-lead` and `-title` as the page resolves them
 *                 at its window width and root font (half a pixel apart is the same). Inside a
 *                 fitted root scaled below 1 (../fit.ts, `data-sk-fit-scale`) a size also passes
 *                 scaled, or at the text floor where the scaled one would be under it, and the
 *                 title's also at the display floor. Left out: the kit's own parts with a size of
 *                 their own (`kitSizes`), text drawn in SVG (its size is in the drawing's units),
 *                 and a page that sets no such token. Like ./probeBase they are put into the page
 *                 as source text.
 * Depends on:     ./probeBase
 * Source:         new in the kit: the handbook asked for the four sizes and nothing checked it.
 */
import type { Base } from './probeBase.js';
export declare function kitSizes(): string;
export declare function textTokens(): number[];
export declare function allowedSizes(el: Element, tokens: readonly number[]): number[];
export declare function offScaleText(b: Base): string[];
export declare const TEXT: {
    kitSizes: typeof kitSizes;
    textTokens: typeof textTokens;
    allowedSizes: typeof allowedSizes;
    offScaleText: typeof offScaleText;
};
export type Text = typeof TEXT;
