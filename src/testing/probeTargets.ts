/**
 * @file   src/testing/probeTargets.ts
 * @brief  The probe's rule for small controls, and the one place a smaller one passes.
 *
 * Responsibility: `smallTargets` is a control under the least size (a link in running text is
 *                 exempt; a checkbox or radio in a label is measured by the label). `denseEnough`:
 *                 a link or, since v0.39.0, a button in a dense list (`.sk-dense-list`, K112,
 *                 K117) passes at 24 px with 4 px clear of every other control seen at the same
 *                 time, and nowhere else. A control hidden
 *                 or scrolled out of view is no neighbour (since v0.39.0), nor is one past the
 *                 window's edge from it.
 *                 Like ./probeBase they are put into the page as source text.
 * Depends on:     ./probeBase
 * Source:         ./probeRules, moved here (v0.39.0); the neighbours' fix from Bingo Royale's
 *                 report on v0.38.0.
 */
import type { Base } from './probeBase.js';

// True when two controls can be seen at the same time: neither hidden or scrolled out of its
// box, and both in the window or both past it (they come into it together).
export function seenTogether(b: Base, one: Element, other: Element): boolean {
  const boxes = [one, other].map((el) => (b.shown(el) ? b.seenBox(el) : null));
  if (boxes.some((box) => box === null || b.isEmpty(box))) return false;
  return b.inSight(one) === b.inSight(other);
}

// A dense list's link or button: 24 px high and wide, and 4 px (half a pixel of rounding) clear
// all round.
export function denseEnough(b: Base, el: Element, r: DOMRect): boolean {
  if (!el.matches('a, button, [role=button]') || el.closest('.sk-dense-list') === null) {
    return false;
  }
  if (Math.min(r.width, r.height) < 23.5) return false;
  return b.controls().every((other) => {
    if (other === el || !seenTogether(b, el, other)) return true;
    const o = b.seenBox(other);
    return (
      o.top - r.bottom >= 3.5 ||
      r.top - o.bottom >= 3.5 ||
      o.left - r.right >= 3.5 ||
      r.left - o.right >= 3.5
    );
  });
}

export function smallTargets(b: Base, least: number): string[] {
  return b.controls().flatMap((el) => {
    const boxed = el.matches('input[type=checkbox], input[type=radio]');
    const target = (boxed ? el.closest('label') : null) ?? el;
    if (!b.shown(target) || b.inText(el)) return [];
    const r = target.getBoundingClientRect();
    if (Math.min(r.width, r.height) >= least - 0.5 || denseEnough(b, target, r)) return [];
    return [`${b.nameOf(target)} ${String(Math.round(r.width))}x${String(Math.round(r.height))}`];
  });
}

// The rules as one object, in the order the page defines them.
export const TARGETS = { seenTogether, denseEnough, smallTargets };
export type Targets = typeof TARGETS;
