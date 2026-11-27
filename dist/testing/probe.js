import { BASE } from './probeBase.js';
import { RULES } from './probeRules.js';
import { TARGETS } from './probeTargets.js';
// True when a box between the element and the root, the root included, scrolls: its content is
// reachable.
function clipsInside(el, root) {
    for (let a = el.parentElement; a !== null; a = a.parentElement) {
        const style = getComputedStyle(a);
        if (/auto|scroll/.test(`${style.overflowX} ${style.overflowY}`))
            return true;
        if (a === root)
            break;
    }
    return false;
}
// The first part of a fitted root that reaches outside its padding box, where `overflow: hidden`
// cuts. Content that only runs into the root's own padding is still seen, so it does not count.
function outsideOf(b, root) {
    const box = root.getBoundingClientRect();
    const left = box.left + root.clientLeft;
    const top = box.top + root.clientTop;
    for (const el of root.querySelectorAll('*')) {
        if (!b.shown(el))
            continue;
        const over = [el.getBoundingClientRect(), ...b.textBoxes(el)].some((r) => r.left < left - 1.5 ||
            r.top < top - 1.5 ||
            r.right > left + root.clientWidth + 1.5 ||
            r.bottom > top + root.clientHeight + 1.5);
        if (over && !clipsInside(el, root))
            return b.nameOf(el);
    }
    return null;
}
function clippedFits(b) {
    return [...document.body.querySelectorAll('[data-sk-fit-scale]')].flatMap((root) => {
        const part = b.shown(root) ? outsideOf(b, root) : null;
        return part === null ? [] : [`${b.nameOf(root)} cuts ${part}`];
    });
}
// The whole measurement, as the page runs it (exported for the unit tests, not from the entry).
export function runProbe(targetPx, b = BASE, r = { ...RULES, ...TARGETS }) {
    const { clientWidth: width, clientHeight: height } = document.documentElement;
    const page = document.scrollingElement ?? document.documentElement;
    const cut = [...document.body.querySelectorAll('*')].flatMap((el) => {
        if (!b.shown(el))
            return [];
        const boxes = b.textBoxes(el);
        return boxes.length > 0 && r.isCut(b, el, boxes) ? [b.nameOf(el)] : [];
    });
    return {
        hScroll: page.scrollWidth > width + 1,
        outside: [...r.wideBoxes(b, width), ...r.edgeBoxes(b, height)],
        cut,
        smallTargets: r.smallTargets(b, targetPx),
        overlaps: r.overlaps(b),
        clippedFits: clippedFits(b),
    };
}
// Every function the page needs, in one place: their source is what is injected, each as a
// constant of its own name.
const OWN = [clipsInside, outsideOf, clippedFits, runProbe];
// One expression: define the parts in the page, then run `call` there.
function inPage(call) {
    const rules = { ...RULES, ...TARGETS };
    const parts = [...Object.entries(BASE), ...Object.entries(rules)];
    const body = [
        ...parts.map(([name, part]) => `const ${name} = ${part.toString()};`),
        ...OWN.map((part) => `const ${part.name} = ${part.toString()};`),
        `const base = { ${Object.keys(BASE).join(', ')} };`,
        `const rules = { ${Object.keys(rules).join(', ')} };`,
    ].join('\n');
    return `(() => {\n${body}\nreturn ${call};\n})()`;
}
export async function probe(page, targetPx = 44) {
    return page.evaluate(inPage(`runProbe(${String(targetPx)}, base, rules)`));
}
export async function wholeCount(page, selector) {
    return page.evaluate(inPage(`wholeItems(base, ${JSON.stringify(selector)})`));
}
