// The kit's parts whose size is their own: the start card's title, the result frame's headline
// and the game bar's count (its badge floor).
export function kitSizes() {
    return '.sk-start-head h1, .sk-result-head > :is(h1, h2, h3, h4, h5, h6):first-child, .sk-bar-badge';
}
// The four tokens in px, smallest first, resolved on a box of the page's own; none where the
// page does not set them all.
export function textTokens() {
    const names = ['small', 'body', 'lead', 'title'].map((name) => `--sk-font-size-${name}`);
    const root = getComputedStyle(document.documentElement);
    if (names.some((name) => root.getPropertyValue(name).trim() === ''))
        return [];
    const box = document.createElement('span');
    document.body.append(box);
    const sizes = names.map((name) => {
        box.style.fontSize = `var(${name})`;
        return Number.parseFloat(getComputedStyle(box).fontSize);
    });
    box.remove();
    return sizes;
}
// The sizes an element's text may have: the tokens, and under a fit's scale what the kit's own
// rules make of them (../../css/fit.css).
export function allowedSizes(el, tokens) {
    const root = el.closest('[data-sk-fit-scale]');
    const scale = Number(root?.getAttribute('data-sk-fit-scale') ?? 1);
    if (!(scale < 1))
        return [...tokens];
    const style = getComputedStyle(el);
    const floor = (name) => Number.parseFloat(style.getPropertyValue(name)) || 0;
    const scaled = tokens.map((size) => size * scale);
    return [
        ...tokens,
        ...scaled,
        ...scaled.map((size) => Math.max(size, floor('--sk-floor-text'))),
        Math.max(scaled.at(-1) ?? 0, floor('--sk-floor-display')),
    ];
}
export function offScaleText(b) {
    const tokens = textTokens();
    if (tokens.length === 0)
        return [];
    return [...document.body.querySelectorAll('*')].flatMap((el) => {
        if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml' || el.closest(kitSizes()) !== null) {
            return [];
        }
        if (!b.shown(el) || b.textBoxes(el).length === 0)
            return [];
        const size = Number.parseFloat(getComputedStyle(el).fontSize);
        if (allowedSizes(el, tokens).some((allowed) => Math.abs(allowed - size) <= 0.5))
            return [];
        return [b.marked(el, `${b.nameOf(el)} ${String(Math.round(size * 10) / 10)}px`)];
    });
}
// The rule as one object, in the order the page defines its parts.
export const TEXT = { kitSizes, textTokens, allowedSizes, offScaleText };
