/**
 * @file   src/react/useHeaderFold.ts
 * @brief  React hook: whether the app header folds its items into the Menu button, whenever
 *         they do not fit on one row.
 *
 * Responsibility: the header takes one row at every width (Bingo R1; "the top bar never takes
 *                 two rows"). Unfolded, its items show in the bar; when they would take a second
 *                 row (an item starts below another's bottom) it folds before the browser paints.
 *                 The answer depends only on the width and the items, never on how the page got
 *                 there (since v0.27.0): every decision measures the unfolded layout, also of a
 *                 folded header, and nothing is remembered from an earlier one. An unfolded
 *                 header is measured on every render; a folded one again when its items or
 *                 `foldBelow` change, when the window's width or the header's own size changes
 *                 (not through the fold itself: the size is noted after each decision, so one
 *                 change is one retry and nothing loops), and when web fonts have loaded
 *                 (`document.fonts` `ready` and `loadingdone`), since text set in a late font
 *                 changes its width. The header carries the answer as `data-sk-folded`
 *                 (../../css/header.css). No fixed width: what fits is measured, so a short bar
 *                 stays unfolded on a tablet and a long one (an admin's, the back link in website
 *                 mode) folds at 1280 px. A render never reads the window: the first one is
 *                 unfolded and the layout effect decides before the paint.
 *                 A game may also pass `foldBelow` (since v0.13.0, Bingo's wish, K40): under that
 *                 window width the header is always folded, on top of the measure; from it up
 *                 the measure decides. Without it nothing changes.
 * Source:         seasonal-bingo-royale apps/web/src/shell/useBarFold.ts at 5c613c0 (its
 *                 `wraps`, the fold before paint), without its fixed 960 px; the fonts as
 *                 ../fit.ts watches them.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// A pixel of rounding between a row's bottom and the next item's top is no second row.
const ROW_SLACK_PX = 1;

// True when an item of the header starts below another item's bottom (a second row). The
// fold's panel shows its items in the bar while unfolded (display: contents), so they count.
function wraps(header: Element): boolean {
  const items = [...header.children, ...(header.querySelector('.sk-menu')?.children ?? [])]
    .filter((e) => getComputedStyle(e).display !== 'contents')
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.height > 0);
  if (items.length === 0) return false;
  const firstBottom = Math.min(...items.map((r) => r.bottom));
  return items.some((r) => r.top >= firstBottom - ROW_SLACK_PX);
}

// Folded or not, from nothing but the window, `foldBelow` and the unfolded layout, which is
// laid out for the measure and replaced by the answer before anything is painted.
function decide(bar: HTMLElement, foldBelow: number | undefined): boolean {
  let folds = foldBelow !== undefined && window.innerWidth < foldBelow;
  if (!folds) {
    bar.dataset['skFolded'] = 'false';
    folds = wraps(bar);
  }
  bar.dataset['skFolded'] = String(folds);
  return folds;
}

// What a decision was made for: the window's width and the header's own box.
const sizeOf = (bar: HTMLElement): string =>
  [window.innerWidth, bar.offsetWidth, bar.offsetHeight].join(' ');

interface Seen {
  readonly header: HTMLElement | null;
  // The size the last decision left behind.
  readonly size: string;
  // A reason to measure a folded header again.
  readonly stale: boolean;
}

// New sizes and late fonts: mark the decision stale and render again.
function useRetry(seen: RefObject<Seen>): void {
  const [, render] = useState(0);
  useEffect(() => {
    let live = true;
    const retry = (): void => {
      seen.current = { ...seen.current, stale: true };
      render((n) => n + 1);
    };
    const resized = (): void => {
      const { header, size } = seen.current;
      if (header !== null && sizeOf(header) !== size) retry();
    };
    window.addEventListener('resize', resized);
    const box = seen.current.header;
    // Browsers only; a test's DOM may have no ResizeObserver, and no font set.
    const observer =
      typeof ResizeObserver === 'undefined' || box === null ? null : new ResizeObserver(resized);
    if (box !== null) observer?.observe(box);
    const fonts = document.fonts as FontFaceSet | undefined;
    fonts?.addEventListener('loadingdone', retry);
    void fonts?.ready.then(() => {
      if (live) retry();
    });
    return () => {
      live = false;
      window.removeEventListener('resize', resized);
      observer?.disconnect();
      fonts?.removeEventListener('loadingdone', retry);
    };
  }, [seen]);
}

// `inside`: an element whose parent is the header; `items`: changes when its items may;
// `foldBelow`: a window width in px under which the header always folds (since v0.13.0).
export function useHeaderFold(
  inside: RefObject<HTMLElement | null>,
  items: string,
  foldBelow?: number,
): boolean {
  const [folded, setFolded] = useState(false);
  const seen = useRef<Seen>({ header: null, size: '', stale: true });
  useLayoutEffect(() => {
    seen.current = { ...seen.current, stale: true };
  }, [items, foldBelow]);
  // Before the browser paints: one row, or fold.
  useLayoutEffect(() => {
    const bar = inside.current?.parentElement ?? null;
    if (bar === null) return;
    // A folded header with no new reason stays as it is (its open menu keeps its place).
    if (folded && !seen.current.stale) {
      seen.current = { ...seen.current, header: bar };
      return;
    }
    const answer = decide(bar, foldBelow);
    seen.current = { header: bar, size: sizeOf(bar), stale: false };
    if (answer !== folded) setFolded(answer);
  });
  useRetry(seen);
  return folded;
}
