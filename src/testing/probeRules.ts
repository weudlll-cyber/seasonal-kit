/**
 * @file   src/testing/probeRules.ts
 * @brief  The probe's rules: boxes past the window, cut text, small and overlapping controls.
 *
 * Responsibility: in-page functions ./probe runs, each given ./probeBase's helpers (`b`):
 *                 - `wideBoxes`: the outermost boxes reaching past the window's sides outside any
 *                   scrolling box; `edgeBoxes` (since v0.36.0) the same past the top of the page,
 *                   and past the bottom where nothing scrolls to it (a page that does not
 *                   scroll, or a fixed box);
 *                 - `isCut`: text a hard clip or an ellipsis hides, but for the kit's own
 *                   intended ellipses, listed in `kitEllipses` alone (since v0.36.0);
 *                 - `smallTargets`: a control under the least size. A link in a dense list
 *                   (`.sk-dense-list`, since v0.36.0, K112) passes at 24 px with 4 px clear of
 *                   every other control; nowhere else;
 *                 - `overlaps` (since v0.36.0): a control in the page's flow lying over, or
 *                   under, a part beside it or beside one of its boxes. Boxes placed out of the
 *                   flow (menus, sheets, badges) are meant to lie over others and are left out;
 *                 - `wholeItems` (since v0.38.0): how many of a selector's elements are wholly in
 *                   sight, in the window and in every box around them.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         `wideBoxes`, `isCut` and `smallTargets` moved from ./probe.ts (v0.36.0); the
 *                 rest new in the kit (findings of Mini Games, Cases and Bingo at v0.34.0).
 */
import type { Base, Rect } from './probeBase.js';

// The kit's own ellipses, meant to hide the end of a line: the chat bar's newest message.
export function kitEllipses(): string {
  return '.sk-chat-bar-newest';
}

export function controls(): Element[] {
  return [
    ...document.body.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]',
    ),
  ];
}

// True when a hard clip takes more than a pixel and a half off a text box that a scroll shows.
export function isCut(b: Base, el: Element, boxes: Rect[]): boolean {
  if (el.closest(kitEllipses()) !== null) return false;
  const style = getComputedStyle(el);
  if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) return true;
  const { scroll, hard } = b.clipsOf(el);
  return boxes.some((box) => {
    const seen = b.meet(box, scroll);
    if (seen.right - seen.left < 1 || seen.bottom - seen.top < 1) return false;
    const left = b.meet(seen, hard);
    const lostX = seen.right - seen.left - Math.max(0, left.right - left.left);
    const lostY = seen.bottom - seen.top - Math.max(0, left.bottom - left.top);
    return lostX > 1.5 || lostY > 1.5;
  });
}

// The outermost of the boxes that `past` names, each with where it reaches.
export function outermost(b: Base, past: (el: Element, r: DOMRect) => string | null): string[] {
  const marked = new Set<Element>();
  const out: string[] = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    const where = r.width < 1 || !b.shown(el) ? null : past(el, r);
    if (where === null) continue;
    if (el.parentElement !== null && marked.has(el.parentElement)) {
      marked.add(el);
    } else if (!b.clipsOf(el).scrolls) {
      marked.add(el);
      out.push(`${b.nameOf(el)} ${where}`);
    }
  }
  return out;
}

export function wideBoxes(b: Base, width: number): string[] {
  return outermost(b, (_el, r) =>
    r.right <= width + 1 && r.left >= -1
      ? null
      : `${String(Math.round(r.left))}..${String(Math.round(r.right))}`,
  );
}

// A box lying across the top or the bottom edge; one wholly outside is put away on purpose.
export function edgeBoxes(b: Base, height: number): string[] {
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

// A dense list's link: 24 px high and wide, and 4 px (half a pixel of rounding) clear all round.
export function denseEnough(b: Base, el: Element, r: DOMRect): boolean {
  if (el.tagName !== 'A' || el.closest('.sk-dense-list') === null) return false;
  if (Math.min(r.width, r.height) < 23.5) return false;
  return controls().every((other) => {
    if (other === el || !b.shown(other)) return true;
    const o = other.getBoundingClientRect();
    return (
      o.top - r.bottom >= 3.5 ||
      r.top - o.bottom >= 3.5 ||
      o.left - r.right >= 3.5 ||
      r.left - o.right >= 3.5
    );
  });
}

export function smallTargets(b: Base, least: number): string[] {
  return controls().flatMap((el) => {
    const boxed = el.matches('input[type=checkbox], input[type=radio]');
    const target = (boxed ? el.closest('label') : null) ?? el;
    if (!b.shown(target) || b.inText(el)) return [];
    const r = target.getBoundingClientRect();
    if (Math.min(r.width, r.height) >= least - 0.5 || denseEnough(b, target, r)) return [];
    return [`${b.nameOf(target)} ${String(Math.round(r.width))}x${String(Math.round(r.height))}`];
  });
}

export function inFlow(el: Element): boolean {
  return ['', 'static', 'relative'].includes(getComputedStyle(el).position);
}

// What of an element can be seen: its box inside what scrolls and clips around it.
export function seenBox(b: Base, el: Element): Rect {
  const { scroll, hard } = b.clipsOf(el);
  return b.meet(b.meet(el.getBoundingClientRect(), scroll), hard);
}

// More than two pixels in both directions in common: fractions and borders touching are none.
export function crosses(b: Base, one: Rect, two: Rect): boolean {
  const both = b.meet(one, two);
  return both.right - both.left > 2 && both.bottom - both.top > 2;
}

// The part beside the control, or beside a box around it, that lies in the same place.
export function overlapOf(b: Base, control: Element): Element | null {
  const mine = seenBox(b, control);
  let node: Element = control;
  while (node !== document.body && node.parentElement !== null && inFlow(node)) {
    const found = [...node.parentElement.children].find(
      (other) =>
        other !== node &&
        b.shown(other) &&
        inFlow(other) &&
        getComputedStyle(other).display !== 'inline' &&
        crosses(b, mine, seenBox(b, other)),
    );
    if (found !== undefined) return found;
    node = node.parentElement;
  }
  return null;
}

export function overlaps(b: Base): string[] {
  return controls().flatMap((control) => {
    if (!b.shown(control) || b.inText(control)) return [];
    const other = overlapOf(b, control);
    return other === null ? [] : [`${b.nameOf(control)} over ${b.nameOf(other)}`];
  });
}

// The elements of a selector the reader sees whole: nothing of them past the window or a box.
export function wholeItems(b: Base, selector: string): number {
  const { clientWidth, clientHeight } = document.documentElement;
  const view = { top: 0, left: 0, bottom: clientHeight, right: clientWidth };
  return [...document.querySelectorAll(selector)].filter((el) => {
    if (!b.shown(el)) return false;
    const box = el.getBoundingClientRect();
    const seen = b.meet(seenBox(b, el), view);
    return seen.right - seen.left >= box.width - 1 && seen.bottom - seen.top >= box.height - 1;
  }).length;
}

// The rules as one object, in the order the page defines them.
export const RULES = {
  kitEllipses,
  controls,
  isCut,
  outermost,
  wideBoxes,
  edgeBoxes,
  denseEnough,
  smallTargets,
  inFlow,
  seenBox,
  crosses,
  overlapOf,
  overlaps,
  wholeItems,
};
export type Rules = typeof RULES;
