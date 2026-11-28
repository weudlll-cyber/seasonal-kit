/**
 * @file   src/testing/probeRules.ts
 * @brief  The probe's rules: boxes past the window, cut text, overlapping controls.
 *
 * Responsibility: in-page functions ./probe runs, each given ./probeBase's helpers (`b`):
 *                 - `wideBoxes`: the outermost boxes reaching past the window's sides outside any
 *                   scrolling box; `edgeBoxes` (since v0.36.0) the same past the top of the page,
 *                   and past the bottom where nothing scrolls to it (a page that does not
 *                   scroll, or a fixed box);
 *                 - `isCut`: text a hard clip or an ellipsis hides, but for the kit's own
 *                   intended ellipses, listed in `kitEllipses` alone (since v0.36.0), whose
 *                   insides the two rules above leave out as well (since v0.39.0: v0.36.0 told
 *                   only this one, so the chat bar's words were still reported outside);
 *                 - `overlaps` (since v0.36.0): a control in the page's flow lying over, or
 *                   under, a part beside it or beside one of its boxes. Boxes placed out of the
 *                   flow (menus, sheets, badges) are meant to lie over others and are left out,
 *                   and since v0.39.0 so is what a game declares (a grid item in a free cell, a
 *                   sheet laid over a grid);
 *                 - `wholeItems` (since v0.38.0): how many of a selector's elements are wholly in
 *                   sight, in the window and in every box around them, and (since v0.40.0)
 *                   covered by nothing: no part painted over a corner or the middle, and no
 *                   sticky `::before` or `::after` of a scrolling box over them. A part that
 *                   takes no pointer (`pointer-events: none`) covers like any other (since
 *                   v0.41.0): it takes one while the count is made (`takeAllPointers`). With
 *                   `leading` (since v0.41.0) the answer is how many of the first items are
 *                   whole, up to the first that is not.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         `wideBoxes` and `isCut` moved from ./probe.ts (v0.36.0); the rest new in the
 *                 kit (findings of Mini Games, Cases and Bingo at v0.34.0). The small controls are
 *                 ./probeTargets since v0.39.0.
 */
import type { Base, Rect } from './probeBase.js';

// Two selectors of an intended overlap (./probe `IntendedOverlap` carries the decision too).
export interface Meant {
  readonly control: string;
  readonly over: string;
}

// The kit's own ellipses, meant to hide the end of a line: the chat bar's newest message.
export function kitEllipses(): string {
  return '.sk-chat-bar-newest';
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
    // What runs on inside one of the kit's ellipses is hidden by it: only the ellipsis box
    // itself can lie outside.
    if (el.parentElement !== null && el.parentElement.closest(kitEllipses()) !== null) continue;
    const r = el.getBoundingClientRect();
    const where = r.width < 1 || !b.shown(el) ? null : past(el, r);
    if (where === null) continue;
    if (el.parentElement !== null && marked.has(el.parentElement)) {
      marked.add(el);
    } else if (!b.clipsOf(el).scrolls) {
      marked.add(el);
      out.push(b.marked(el, `${b.nameOf(el)} ${where}`));
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

export function inFlow(el: Element): boolean {
  return ['', 'static', 'relative'].includes(getComputedStyle(el).position);
}

// More than two pixels in both directions in common: fractions and borders touching are none.
export function crosses(b: Base, one: Rect, two: Rect): boolean {
  const both = b.meet(one, two);
  return both.right - both.left > 2 && both.bottom - both.top > 2;
}

// An overlap a game's owner decided on: the control (or a box around it) over that part.
export function isMeant(meant: readonly Meant[], control: Element, other: Element): boolean {
  return meant.some((m) => control.closest(m.control) !== null && other.closest(m.over) !== null);
}

// The part beside the control, or beside a box around it, that lies in the same place, those a
// game declared apart.
export function overlapOf(b: Base, control: Element, meant: readonly Meant[]): Element | null {
  const mine = b.seenBox(control);
  let node: Element = control;
  while (node !== document.body && node.parentElement !== null && inFlow(node)) {
    const found = [...node.parentElement.children].find(
      (other) =>
        other !== node &&
        b.shown(other) &&
        inFlow(other) &&
        getComputedStyle(other).display !== 'inline' &&
        crosses(b, mine, b.seenBox(other)) &&
        !isMeant(meant, control, other),
    );
    if (found !== undefined) return found;
    node = node.parentElement;
  }
  return null;
}

export function overlaps(b: Base, meant: readonly Meant[]): string[] {
  return b.controls().flatMap((control) => {
    if (!b.shown(control) || b.inText(control)) return [];
    const other = overlapOf(b, control, meant);
    return other === null
      ? []
      : [b.marked(control, `${b.nameOf(control)} over ${b.nameOf(other)}`)];
  });
}

// What a scrolling box's sticky ::before or ::after takes of its visible area: a strip at the
// box's top or bottom, over whatever scrolls there. Null where there is none.
export function stickyStrip(b: Base, box: Element, pseudo: string): Rect | null {
  const style = getComputedStyle(box, pseudo);
  const none = ['', 'none', 'normal'].includes(style.content) || style.display === 'none';
  if (none || style.visibility === 'hidden' || style.position !== 'sticky') return null;
  const px = (value: string): number => Number.parseFloat(value) || 0;
  const high =
    px(style.height) +
    (style.boxSizing === 'border-box'
      ? 0
      : px(style.paddingTop) +
        px(style.paddingBottom) +
        px(style.borderTopWidth) +
        px(style.borderBottomWidth));
  const outer = box.getBoundingClientRect();
  const top = outer.top + box.clientTop;
  const atBottom = style.bottom !== 'auto';
  const from = atBottom ? top + box.clientHeight - px(style.bottom) - high : top + px(style.top);
  const strip = { top: from, bottom: from + high, left: outer.left, right: outer.right };
  return b.isEmpty(strip) ? null : strip;
}

// True where a sticky sign of a scrolling box around the element lies over part of it.
export function underSign(b: Base, el: Element, seen: Rect): boolean {
  for (let a = el.parentElement; a !== null && a !== document.body; a = a.parentElement) {
    if (!/auto|scroll/.test(getComputedStyle(a).overflowY)) continue;
    const strips = [stickyStrip(b, a, '::before'), stickyStrip(b, a, '::after')];
    if (strips.some((strip) => strip !== null && crosses(b, seen, strip))) return true;
  }
  return false;
}

// True where another part is painted over a corner or the middle of the element.
export function paintedOver(el: Element, box: Rect): boolean {
  const [left, right] = [box.left + 1, box.right - 1];
  const [top, bottom] = [box.top + 1, box.bottom - 1];
  const points = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
    [(left + right) / 2, (top + bottom) / 2],
  ] as const;
  return points.some(([x, y]) => {
    const hit = document.elementFromPoint(x, y);
    // The element itself, what it holds, and what holds it (a rounded corner) cover nothing.
    return hit !== null && !el.contains(hit) && !hit.contains(el);
  });
}

// A hit test passes through a part that takes no pointer, which covers all the same. Each such
// part takes one until the returned call puts it back (set on the element itself, which a page's
// content security policy allows).
export function takeAllPointers(): () => void {
  const changed = [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((el) => getComputedStyle(el).pointerEvents === 'none')
    .map((el) => {
      const name = 'pointer-events';
      const own = [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)] as const;
      return { el, own };
    });
  for (const { el } of changed) el.style.setProperty('pointer-events', 'auto', 'important');
  return () => {
    // An empty value takes the property off again.
    for (const { el, own } of changed) el.style.setProperty('pointer-events', ...own);
  };
}

// Whether the reader sees an element whole: nothing of it past the window or a box, and nothing
// painted over it.
export function isWhole(b: Base, el: Element): boolean {
  const box = el.getBoundingClientRect();
  const seen = b.meet(b.seenBox(el), b.windowBox());
  const inside =
    seen.right - seen.left >= box.width - 1 && seen.bottom - seen.top >= box.height - 1;
  return inside && !underSign(b, el, seen) && !paintedOver(el, seen);
}

// How many of a selector's shown elements are whole; with `leading`, how many before the first
// that is not.
export function wholeItems(b: Base, selector: string, leading = false): number {
  const items = [...document.querySelectorAll(selector)].filter((el) => b.shown(el));
  const back = takeAllPointers();
  const whole = items.map((el) => isWhole(b, el));
  back();
  if (!leading) return whole.filter(Boolean).length;
  const first = whole.indexOf(false);
  return first < 0 ? whole.length : first;
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
  isMeant,
  overlapOf,
  overlaps,
  stickyStrip,
  underSign,
  paintedOver,
  takeAllPointers,
  isWhole,
  wholeItems,
};
export type Rules = typeof RULES;
