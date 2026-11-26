/**
 * @file   src/testing/cssColour.ts
 * @brief  The colours a token's value holds, with its `var()` references followed and its
 *         `color-mix()` in srgb worked out, for ./contrast.
 *
 * Responsibility: `resolveValue(value, tokens)` replaces every `var(--name)` (with its fallback
 *                 where the name is unknown) by that token's value, then every
 *                 `color-mix(in srgb, a p%, b q%)` by the colour a browser mixes (premultiplied;
 *                 one share given gives the other its rest; two that sum to under 100 % make the
 *                 result that much transparent), inside out, as `rgb(r g b / a%)`. It returns null
 *                 when something cannot be worked out (an unknown name without a fallback, a cycle,
 *                 another colour space, an operand that is no hex, rgb() or `transparent`), so the
 *                 guard reports it instead of passing it. `coloursIn` reads the colours of a
 *                 resolved value; a gradient holds several.
 * Depends on:     nothing
 * Source:         the mixing from seasonal-mini-games apps/web/src/ownRowTint.test.ts at e91cdef;
 *                 the colour forms moved here from ./contrast.ts (v0.34.0).
 */
export type Rgba = readonly [number, number, number, number];
export declare const coloursIn: (value: string) => Rgba[];
export declare function resolveValue(value: string, tokens: Map<string, string>): string | null;
