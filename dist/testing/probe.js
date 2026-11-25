// A short name for a report: the nearest test id, the tag and its first two classes.
function nameOf(el) {
    const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`);
    const own = `${el.tagName.toLowerCase()}${classes.join('')}`;
    const id = el.closest('[data-testid]')?.getAttribute('data-testid');
    const text = el.textContent.trim().slice(0, 30);
    return `${id === undefined || id === null ? '' : `[${id}] `}${own}${text === '' ? '' : ` "${text}"`}`;
}
function meet(a, b) {
    return {
        top: Math.max(a.top, b.top),
        left: Math.max(a.left, b.left),
        bottom: Math.min(a.bottom, b.bottom),
        right: Math.min(a.right, b.right),
    };
}
// What the ancestors let be seen: the scrolling boxes, and the hard clips (hidden or clip).
function clipsOf(el) {
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
function shown(el) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
}
// The boxes of an element's own text.
function textBoxes(el) {
    return [...el.childNodes].flatMap((node) => {
        if (node.nodeType !== Node.TEXT_NODE || (node.textContent ?? '').trim() === '')
            return [];
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2);
    });
}
// True when a hard clip takes more than a pixel and a half off a text box that a scroll shows.
function isCut(el, boxes) {
    const style = getComputedStyle(el);
    if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
        return true;
    const { scroll, hard } = clipsOf(el);
    return boxes.some((box) => {
        const seen = meet(box, scroll);
        if (seen.right - seen.left < 1 || seen.bottom - seen.top < 1)
            return false;
        const left = meet(seen, hard);
        const lostX = seen.right - seen.left - Math.max(0, left.right - left.left);
        const lostY = seen.bottom - seen.top - Math.max(0, left.bottom - left.top);
        return lostX > 1.5 || lostY > 1.5;
    });
}
function wideBoxes(width) {
    const marked = new Set();
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || (r.right <= width + 1 && r.left >= -1) || !shown(el))
            continue;
        if (el.parentElement !== null && marked.has(el.parentElement)) {
            marked.add(el);
        }
        else if (!clipsOf(el).scrolls) {
            marked.add(el);
            out.push(`${nameOf(el)} ${String(Math.round(r.left))}..${String(Math.round(r.right))}`);
        }
    }
    return out;
}
// A link among words of its parent: WCAG 2.5.8's inline exception.
function inText(el) {
    if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline')
        return false;
    return [...(el.parentElement?.childNodes ?? [])].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
}
function smallTargets(least) {
    const controls = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]';
    return [...document.body.querySelectorAll(controls)].flatMap((el) => {
        const boxed = el.matches('input[type=checkbox], input[type=radio]');
        const target = (boxed ? el.closest('label') : null) ?? el;
        if (!shown(target) || inText(el))
            return [];
        const r = target.getBoundingClientRect();
        if (Math.min(r.width, r.height) >= least - 0.5)
            return [];
        return [`${nameOf(target)} ${String(Math.round(r.width))}x${String(Math.round(r.height))}`];
    });
}
// The first part of a fitted root that reaches outside its padding box, where `overflow: hidden`
// cuts. Content that only runs into the root's own padding is still seen, so it does not count.
function outsideOf(root) {
    const box = root.getBoundingClientRect();
    const left = box.left + root.clientLeft;
    const top = box.top + root.clientTop;
    for (const el of root.querySelectorAll('*')) {
        if (!shown(el))
            continue;
        const over = [el.getBoundingClientRect(), ...textBoxes(el)].some((r) => r.left < left - 1.5 ||
            r.top < top - 1.5 ||
            r.right > left + root.clientWidth + 1.5 ||
            r.bottom > top + root.clientHeight + 1.5);
        if (over && !clipsInside(el, root))
            return nameOf(el);
    }
    return null;
}
// True when a box between the element and the root scrolls: its content is reachable.
function clipsInside(el, root) {
    for (let a = el.parentElement; a !== null && a !== root; a = a.parentElement) {
        const style = getComputedStyle(a);
        if (/auto|scroll/.test(`${style.overflowX} ${style.overflowY}`))
            return true;
    }
    return false;
}
function clippedFits() {
    return [...document.body.querySelectorAll('[data-sk-fit-scale]')].flatMap((root) => {
        const part = shown(root) ? outsideOf(root) : null;
        return part === null ? [] : [`${nameOf(root)} cuts ${part}`];
    });
}
// The whole measurement, as the page runs it (exported for the unit test, not from the entry).
export function runProbe(targetPx) {
    const width = document.documentElement.clientWidth;
    const page = document.scrollingElement ?? document.documentElement;
    const cut = [...document.body.querySelectorAll('*')].flatMap((el) => {
        if (!shown(el))
            return [];
        const boxes = textBoxes(el);
        return boxes.length > 0 && isCut(el, boxes) ? [nameOf(el)] : [];
    });
    return {
        hScroll: page.scrollWidth > width + 1,
        outside: wideBoxes(width),
        cut,
        smallTargets: smallTargets(targetPx),
        clippedFits: clippedFits(),
    };
}
// Every function the page needs, in one place: their source is what is injected.
const PARTS = [
    nameOf,
    meet,
    clipsOf,
    shown,
    textBoxes,
    isCut,
    wideBoxes,
    inText,
    smallTargets,
    outsideOf,
    clipsInside,
    clippedFits,
    runProbe,
];
export async function probe(page, targetPx = 44) {
    const body = PARTS.map((f) => `const ${f.name} = ${f.toString()};`).join('\n');
    // One expression: define the parts, then measure.
    return page.evaluate(`(() => {\n${body}\nreturn runProbe(${String(targetPx)});\n})()`);
}
