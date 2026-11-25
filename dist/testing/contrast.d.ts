/**
 * @file   src/testing/contrast.ts
 * @brief  A static guard for a game's design tokens: text keeps its WCAG contrast on every
 *         background it names, in the light and the dark theme.
 *
 * Responsibility: `findLowContrast({ css, pairs })` reads the token files as text, in the order
 *                 the page loads them (a later value wins), from the `:root` block (light) and the
 *                 `:root[data-theme='dark']` block over it (dark). Each pair names a text token, a
 *                 stack of background tokens from the bottom up (`['--sk-color-background',
 *                 '--sk-color-card']`) and a ratio (4.5 unless named). A translucent layer is
 *                 composited over the layers below; a token that holds several colours (the
 *                 page's glows, the bar's gradient) is checked with each of them. What falls
 *                 short is returned as "theme: text on background, colour: ratio"; a token that
 *                 is missing or holds no colour throws, so a renamed token cannot pass silently.
 * Depends on:     nothing
 * Source:         seasonal-bingo-royale apps/web/src/designTokens.test.ts at 8d20904 (the parsing,
 *                 compositing and WCAG formula; seasonal-mini-games' file at 9e3c6f3 is the same
 *                 test, 80 % alike). Generalised: the pairs are the game's list.
 * Spec:           WCAG 2.2 SC 1.4.3 and 1.4.11
 */
export interface ContrastPair {
    readonly text: string;
    readonly on: readonly string[];
    readonly min?: number;
}
export interface ContrastInput {
    readonly css: readonly string[];
    readonly pairs: readonly ContrastPair[];
}
export declare function findLowContrast(input: ContrastInput): string[];
