/**
 * @file   src/testing/probe.ts
 * @brief  One in-page measurement of a screen: overflow, cut text, small and overlapping
 *         controls, a fitted root whose content does not fit it.
 *
 * Responsibility: `probe(page)` runs in the browser and returns what is wrong with the screen as
 *                 it is now:
 *                 - `hScroll`: the page scrolls sideways;
 *                 - `outside`: the outermost boxes reaching past the window's sides, and (since
 *                   v0.36.0) past its top, or past its bottom where nothing scrolls to them;
 *                 - `cut`: visible text an ancestor's `overflow: hidden` or `clip` cuts, or an
 *                   ellipsis hides (the kit's own intended ones apart, since v0.36.0);
 *                 - `smallTargets`: a control (link, button, field, summary, button role) under
 *                   `targetPx` (44) in either direction. A link inside running text is exempt, as
 *                   WCAG 2.5.8 exempts it; a checkbox or radio in a label is measured by the
 *                   label; a link or button in a `.sk-dense-list` passes at 24 px with room around it
 *                   (since v0.36.0, K112);
 *                 - `overlaps` (since v0.36.0): a control lying over or under a part beside it;
 *                 - `clippedFits`: a fitted root (`[data-sk-fit-scale]`, ../fit.ts) with a part
 *                   outside its padding box, where it is cut: even at its floor it does not fit
 *                   (a root that scrolls hides nothing, since v0.36.0).
 *                 Hidden elements and text only for screen readers (a 1 px box) are left out.
 *                 `wholeCount(page, selector)` (since v0.38.0) counts the elements wholly in
 *                 sight, for the sweep's floors (./sweepFloors).
 *                 The in-page functions (./probeBase, ./probeRules, ./probeTargets and those
 *                 below) are put into the page as source text and call each other by name.
 * Depends on:     ./probeBase, ./probeRules, ./probeTargets; @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/acceptance/fitProbe.ts at 8d20904 (`clipsOf`,
 *                 `readable`, the text fragments, `cutText`, `wideBoxes`, the injection).
 *                 Generalised: touch targets and fitted roots added; its text floor and card
 *                 cells stay in the game.
 */
import type { Page } from '@playwright/test';

import { BASE, type Base } from './probeBase.js';
import { RULES, type Rules } from './probeRules.js';
import { TARGETS, type Targets } from './probeTargets.js';

export interface Probe {
  readonly hScroll: boolean;
  readonly outside: readonly string[];
  readonly cut: readonly string[];
  readonly smallTargets: readonly string[];
  readonly overlaps: readonly string[];
  readonly clippedFits: readonly string[];
}

// True when a box between the element and the root, the root included, scrolls: its content is
// reachable.
function clipsInside(el: Element, root: Element): boolean {
  for (let a = el.parentElement; a !== null; a = a.parentElement) {
    const style = getComputedStyle(a);
    if (/auto|scroll/.test(`${style.overflowX} ${style.overflowY}`)) return true;
    if (a === root) break;
  }
  return false;
}

// The first part of a fitted root that reaches outside its padding box, where `overflow: hidden`
// cuts. Content that only runs into the root's own padding is still seen, so it does not count.
function outsideOf(b: Base, root: Element): string | null {
  const box = root.getBoundingClientRect();
  const left = box.left + root.clientLeft;
  const top = box.top + root.clientTop;
  for (const el of root.querySelectorAll('*')) {
    if (!b.shown(el)) continue;
    const over = [el.getBoundingClientRect(), ...b.textBoxes(el)].some(
      (r) =>
        r.left < left - 1.5 ||
        r.top < top - 1.5 ||
        r.right > left + root.clientWidth + 1.5 ||
        r.bottom > top + root.clientHeight + 1.5,
    );
    if (over && !clipsInside(el, root)) return b.nameOf(el);
  }
  return null;
}

function clippedFits(b: Base): string[] {
  return [...document.body.querySelectorAll('[data-sk-fit-scale]')].flatMap((root) => {
    const part = b.shown(root) ? outsideOf(b, root) : null;
    return part === null ? [] : [`${b.nameOf(root)} cuts ${part}`];
  });
}

// The whole measurement, as the page runs it (exported for the unit tests, not from the entry).
export function runProbe(
  targetPx: number,
  b: Base = BASE,
  r: Rules & Targets = { ...RULES, ...TARGETS },
): Probe {
  const { clientWidth: width, clientHeight: height } = document.documentElement;
  const page = document.scrollingElement ?? document.documentElement;
  const cut = [...document.body.querySelectorAll('*')].flatMap((el) => {
    if (!b.shown(el)) return [];
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
function inPage(call: string): string {
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

export async function probe(page: Page, targetPx = 44): Promise<Probe> {
  return page.evaluate(inPage(`runProbe(${String(targetPx)}, base, rules)`));
}

export async function wholeCount(page: Page, selector: string): Promise<number> {
  return page.evaluate(inPage(`wholeItems(base, ${JSON.stringify(selector)})`));
}
