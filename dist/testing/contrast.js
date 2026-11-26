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
 *                 Since v0.34.0 a token's `var()` and `color-mix(in srgb, …)` are worked out
 *                 (./cssColour), a pair may name such a value instead of a token, and one that
 *                 cannot be worked out is returned as "theme: … unresolved …", never passed.
 * Depends on:     ./cssColour
 * Source:         seasonal-bingo-royale apps/web/src/designTokens.test.ts at 8d20904 (the parsing,
 *                 compositing and WCAG formula; seasonal-mini-games' file at 9e3c6f3 is the same
 *                 test, 80 % alike). Generalised: the pairs are the game's list.
 * Spec:           WCAG 2.2 SC 1.4.3 and 1.4.11
 */
import { coloursIn, resolveValue } from './cssColour.js';
const SELECTORS = { light: [':root'], dark: [':root', ":root[data-theme='dark']"] };
// The custom properties of one theme: every named block of every file, later ones winning.
function tokensOf(css, theme) {
    const tokens = new Map();
    for (const selector of SELECTORS[theme]) {
        for (const file of css) {
            const start = file.indexOf(`${selector} {`);
            const block = start < 0 ? '' : file.slice(start, file.indexOf('\n}', start));
            for (const m of block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
                tokens.set(m[1] ?? '', m[2] ?? '');
            }
        }
    }
    return tokens;
}
// What a pair names: a token, or a value written with tokens (`var()`, `color-mix()`).
const isToken = (name) => name.startsWith('--');
// Every colour it holds (a gradient holds several), or null when it cannot be worked out. A pair
// naming a token that is missing or holds no colour at all throws.
function coloursOf(tokens, name) {
    const value = isToken(name) ? tokens.get(name) : name;
    const resolved = value === undefined ? '' : resolveValue(value, tokens);
    if (resolved === null)
        return null;
    const found = coloursIn(resolved);
    if (found.length === 0)
        throw new Error(`no colour in the token ${name}`);
    return found;
}
function over(top, base) {
    const a = top[3];
    const mix = (i) => top[i] * a + base[i] * (1 - a);
    return [mix(0), mix(1), mix(2), 1];
}
function luminance(c) {
    const channel = (v) => {
        const s = v / 255;
        return s <= 0.040_45 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}
function contrastRatio(a, b) {
    const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}
// Every background the stack can make: each colour of each layer over each result below.
function backgrounds(layers) {
    return layers.reduce((below, layer) => layer.flatMap((top) => below.map((base) => over(top, base))), 
    // White under the bottom layer, as a browser paints a page.
    [[255, 255, 255, 1]]);
}
// One pair in one theme: what falls short, or what could not be worked out.
function shortOf(tokens, theme, pair) {
    const min = pair.min ?? 4.5;
    const where = `${theme}: ${pair.text} on ${pair.on.join(' + ')}`;
    const text = coloursOf(tokens, pair.text);
    const layers = pair.on.map((name) => coloursOf(tokens, name));
    const lost = [pair.text, ...pair.on].filter((_, i) => [text, ...layers][i] === null);
    // Never passed: a value the guard cannot work out is a finding of its own.
    if (text === null || lost.length > 0)
        return [`${where}: unresolved ${lost.join(', ')}`];
    return backgrounds(layers).flatMap((bg) => text
        .map((colour) => contrastRatio(over(colour, bg), bg))
        .filter((ratio) => ratio < min)
        .map((ratio) => `${where}: ${ratio.toFixed(2)} < ${String(min)}`));
}
export function findLowContrast(input) {
    return ['light', 'dark'].flatMap((theme) => {
        const tokens = tokensOf(input.css, theme);
        return input.pairs.flatMap((pair) => shortOf(tokens, theme, pair));
    });
}
