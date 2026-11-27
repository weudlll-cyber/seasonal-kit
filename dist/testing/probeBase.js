// A short name for a report: the nearest test id, the tag and its first two classes.
export function nameOf(el) {
    const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`);
    const own = `${el.tagName.toLowerCase()}${classes.join('')}`;
    const id = el.closest('[data-testid]')?.getAttribute('data-testid');
    const text = el.textContent.trim().slice(0, 30);
    return `${id === undefined || id === null ? '' : `[${id}] `}${own}${text === '' ? '' : ` "${text}"`}`;
}
export function meet(a, b) {
    return {
        top: Math.max(a.top, b.top),
        left: Math.max(a.left, b.left),
        bottom: Math.min(a.bottom, b.bottom),
        right: Math.min(a.right, b.right),
    };
}
// What the ancestors let be seen: the scrolling boxes, and the hard clips (hidden or clip).
export function clipsOf(el) {
    const all = { top: -1e9, left: -1e9, bottom: 1e9, right: 1e9 };
    let scroll = all;
    let hard = all;
    for (let a = el; a !== null && a !== document.body; a = a.parentElement) {
        const style = getComputedStyle(a);
        const flow = `${style.overflowX} ${style.overflowY}`;
        if (/auto|scroll/.test(flow))
            scroll = meet(scroll, a.getBoundingClientRect());
        if (/hidden|clip/.test(flow))
            hard = meet(hard, a.getBoundingClientRect());
    }
    return { scroll, hard, scrolls: scroll !== all };
}
// Seen by the reader: visible and not a 1 px box for screen readers only.
export function shown(el) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
}
// The boxes of an element's own text.
export function textBoxes(el) {
    return [...el.childNodes].flatMap((node) => {
        if (node.nodeType !== Node.TEXT_NODE || (node.textContent ?? '').trim() === '')
            return [];
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2);
    });
}
// A link among words of its parent: WCAG 2.5.8's inline exception.
export function inText(el) {
    if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline')
        return false;
    return [...(el.parentElement?.childNodes ?? [])].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
}
// The helpers as one object, handed to the rules.
export const BASE = { nameOf, meet, clipsOf, shown, textBoxes, inText };
