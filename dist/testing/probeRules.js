// The kit's own ellipses, meant to hide the end of a line: the chat bar's newest message.
export function kitEllipses() {
    return '.sk-chat-bar-newest';
}
// True when a hard clip takes more than a pixel and a half off a text box that a scroll shows.
export function isCut(b, el, boxes) {
    if (el.closest(kitEllipses()) !== null)
        return false;
    const style = getComputedStyle(el);
    if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
        return true;
    const { scroll, hard } = b.clipsOf(el);
    return boxes.some((box) => {
        const seen = b.meet(box, scroll);
        if (seen.right - seen.left < 1 || seen.bottom - seen.top < 1)
            return false;
        const left = b.meet(seen, hard);
        const lostX = seen.right - seen.left - Math.max(0, left.right - left.left);
        const lostY = seen.bottom - seen.top - Math.max(0, left.bottom - left.top);
        return lostX > 1.5 || lostY > 1.5;
    });
}
// The outermost of the boxes that `past` names, each with where it reaches.
export function outermost(b, past) {
    const marked = new Set();
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        const where = r.width < 1 || !b.shown(el) ? null : past(el, r);
        if (where === null)
            continue;
        if (el.parentElement !== null && marked.has(el.parentElement)) {
            marked.add(el);
        }
        else if (!b.clipsOf(el).scrolls) {
            marked.add(el);
            out.push(b.marked(el, `${b.nameOf(el)} ${where}`));
        }
    }
    return out;
}
export function wideBoxes(b, width) {
    return outermost(b, (_el, r) => r.right <= width + 1 && r.left >= -1
        ? null
        : `${String(Math.round(r.left))}..${String(Math.round(r.right))}`);
}
// A box lying across the top or the bottom edge; one wholly outside is put away on purpose.
export function edgeBoxes(b, height) {
    const page = document.scrollingElement ?? document.documentElement;
    const still = page.scrollHeight <= height + 1;
    return outermost(b, (el, r) => {
        const fixed = getComputedStyle(el).position === 'fixed';
        const top = r.top + (fixed ? 0 : page.scrollTop);
        const above = top < -1 && top + r.height > 1;
        const below = (still || fixed) && r.bottom > height + 1 && r.top < height - 1;
        return above || below
            ? `y ${String(Math.round(r.top))}..${String(Math.round(r.bottom))}`
            : null;
    });
}
export function inFlow(el) {
    return ['', 'static', 'relative'].includes(getComputedStyle(el).position);
}
// More than two pixels in both directions in common: fractions and borders touching are none.
export function crosses(b, one, two) {
    const both = b.meet(one, two);
    return both.right - both.left > 2 && both.bottom - both.top > 2;
}
// The part beside the control, or beside a box around it, that lies in the same place.
export function overlapOf(b, control) {
    const mine = b.seenBox(control);
    let node = control;
    while (node !== document.body && node.parentElement !== null && inFlow(node)) {
        const found = [...node.parentElement.children].find((other) => other !== node &&
            b.shown(other) &&
            inFlow(other) &&
            getComputedStyle(other).display !== 'inline' &&
            crosses(b, mine, b.seenBox(other)));
        if (found !== undefined)
            return found;
        node = node.parentElement;
    }
    return null;
}
export function overlaps(b) {
    return b.controls().flatMap((control) => {
        if (!b.shown(control) || b.inText(control))
            return [];
        const other = overlapOf(b, control);
        return other === null
            ? []
            : [b.marked(control, `${b.nameOf(control)} over ${b.nameOf(other)}`)];
    });
}
// The elements of a selector the reader sees whole: nothing of them past the window or a box.
export function wholeItems(b, selector) {
    return [...document.querySelectorAll(selector)].filter((el) => {
        if (!b.shown(el))
            return false;
        const box = el.getBoundingClientRect();
        const seen = b.meet(b.seenBox(el), b.windowBox());
        return seen.right - seen.left >= box.width - 1 && seen.bottom - seen.top >= box.height - 1;
    }).length;
}
// The rules as one object, in the order the page defines them.
export const RULES = {
    kitEllipses,
    isCut,
    outermost,
    wideBoxes,
    edgeBoxes,
    inFlow,
    crosses,
    overlapOf,
    overlaps,
    wholeItems,
};
