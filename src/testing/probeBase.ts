/**
 * @file   src/testing/probeBase.ts
 * @brief  The probe's shared in-page helpers: names, boxes, what is clipped and what is seen.
 *
 * Responsibility: `nameOf` names an element for a report; `meet` is two boxes' common part;
 *                 `clipsOf` what the ancestors let be seen (the scrolling boxes, and the hard
 *                 clips: hidden or clip); `shown` whether a reader sees it (visible, and no 1 px
 *                 box for screen readers only); `textBoxes` the boxes of an element's own text;
 *                 `inText` WCAG 2.5.8's inline exception. ./probe puts these functions into the
 *                 page as source text, where they call each other by name, so they use nothing
 *                 imported; ./probeRules gets them as the object `BASE`, since a test's or
 *                 Playwright's own build renames imported names inside a function's source.
 * Source:         ./probe.ts, moved here unchanged (v0.36.0); from seasonal-bingo-royale
 *                 e2e/acceptance/fitProbe.ts at 8d20904.
 */
export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

// A short name for a report: the nearest test id, the tag and its first two classes.
export function nameOf(el: Element): string {
  const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`);
  const own = `${el.tagName.toLowerCase()}${classes.join('')}`;
  const id = el.closest('[data-testid]')?.getAttribute('data-testid');
  const text = el.textContent.trim().slice(0, 30);
  return `${id === undefined || id === null ? '' : `[${id}] `}${own}${text === '' ? '' : ` "${text}"`}`;
}

export function meet(a: Rect, b: Rect): Rect {
  return {
    top: Math.max(a.top, b.top),
    left: Math.max(a.left, b.left),
    bottom: Math.min(a.bottom, b.bottom),
    right: Math.min(a.right, b.right),
  };
}

// What the ancestors let be seen: the scrolling boxes, and the hard clips (hidden or clip).
export function clipsOf(el: Element): { scroll: Rect; hard: Rect; scrolls: boolean } {
  const all = { top: -1e9, left: -1e9, bottom: 1e9, right: 1e9 };
  let scroll: Rect = all;
  let hard: Rect = all;
  for (let a: Element | null = el; a !== null && a !== document.body; a = a.parentElement) {
    const style = getComputedStyle(a);
    const flow = `${style.overflowX} ${style.overflowY}`;
    if (/auto|scroll/.test(flow)) scroll = meet(scroll, a.getBoundingClientRect());
    if (/hidden|clip/.test(flow)) hard = meet(hard, a.getBoundingClientRect());
  }
  return { scroll, hard, scrolls: scroll !== all };
}

// Seen by the reader: visible and not a 1 px box for screen readers only.
export function shown(el: Element): boolean {
  if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  const box = el.getBoundingClientRect();
  return box.width > 1 && box.height > 1;
}

// The boxes of an element's own text.
export function textBoxes(el: Element): Rect[] {
  return [...el.childNodes].flatMap((node) => {
    if (node.nodeType !== Node.TEXT_NODE || (node.textContent ?? '').trim() === '') return [];
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2);
  });
}

// A link among words of its parent: WCAG 2.5.8's inline exception.
export function inText(el: Element): boolean {
  if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false;
  return [...(el.parentElement?.childNodes ?? [])].some(
    (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
  );
}

// The helpers as one object, handed to the rules.
export const BASE = { nameOf, meet, clipsOf, shown, textBoxes, inText };
export type Base = typeof BASE;
