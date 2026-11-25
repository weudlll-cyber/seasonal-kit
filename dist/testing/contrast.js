const SELECTORS = { light: [':root'], dark: [':root', ":root[data-theme='dark']"] };
const COLOUR = /#[0-9a-f]{6}|rgb\(\d+ \d+ \d+(?: \/ [\d.]+%)?\)/gi;
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
function parse(value) {
    if (value.startsWith('#')) {
        const at = (i) => Number.parseInt(value.slice(i, i + 2), 16);
        return [at(1), at(3), at(5), 1];
    }
    const [r = 0, g = 0, b = 0, a] = [...value.matchAll(/[\d.]+/g)].map((m) => Number(m[0]));
    return [r, g, b, a === undefined ? 1 : a / 100];
}
// Every colour a token holds (a gradient holds several).
function coloursOf(tokens, name) {
    const found = (tokens.get(name)?.match(COLOUR) ?? []).map(parse);
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
function backgrounds(tokens, stack) {
    return stack.reduce((below, name) => coloursOf(tokens, name).flatMap((layer) => below.map((base) => over(layer, base))), 
    // White under the bottom layer, as a browser paints a page.
    [[255, 255, 255, 1]]);
}
export function findLowContrast(input) {
    return ['light', 'dark'].flatMap((theme) => {
        const tokens = tokensOf(input.css, theme);
        return input.pairs.flatMap((pair) => {
            const min = pair.min ?? 4.5;
            return backgrounds(tokens, pair.on).flatMap((bg) => coloursOf(tokens, pair.text)
                .map((text) => contrastRatio(over(text, bg), bg))
                .filter((ratio) => ratio < min)
                .map((ratio) => `${theme}: ${pair.text} on ${pair.on.join(' + ')}: ${ratio.toFixed(2)} < ${String(min)}`));
        });
    });
}
