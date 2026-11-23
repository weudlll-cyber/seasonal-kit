/**
 * @file   src/react/useHeaderFold.ts
 * @brief  React hook: whether the app header folds its items into the Menu button, whenever
 *         they do not fit on one row.
 *
 * Responsibility: the header takes one row at every width (Bingo R1; "the top bar never takes
 *                 two rows"). Unfolded, its items show in the bar; when they would take a second
 *                 row (an item starts below another's bottom) it folds before the browser paints
 *                 and remembers the width it folded at. It tries one row again when the window
 *                 grows past that width and whenever its items change (a new route, another
 *                 sign-in, `items`), and checks again when the window or the header changes size
 *                 (a larger font). The header carries the answer as `data-sk-folded`
 *                 (../../css/header.css). No fixed width: what fits is measured, so a short bar
 *                 stays unfolded on a tablet and a long one (an admin's, the back link in website
 *                 mode) folds at 1280 px. A render never reads the window: the first one is
 *                 unfolded and the layout effect decides before the paint.
 * Source:         seasonal-bingo-royale apps/web/src/shell/useBarFold.ts at 5c613c0 (its
 *                 `wraps`, the fold before paint, `foldedAt`), without its fixed 960 px.
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

// Window resizes and size changes of the header: check again (unfold past `foldedAt`).
function useRecheck(
  header: RefObject<HTMLElement | null>,
  foldedAt: RefObject<number>,
  setFolded: (folded: boolean) => void,
): void {
  const [, recheck] = useState(0);
  useEffect(() => {
    const again = (): void => {
      recheck((n) => n + 1);
    };
    const resized = (): void => {
      if (window.innerWidth > foldedAt.current) setFolded(false);
      again();
    };
    window.addEventListener('resize', resized);
    const box = header.current;
    // Browsers only; a test's DOM may have no ResizeObserver.
    const observer =
      typeof ResizeObserver === 'undefined' || box === null ? null : new ResizeObserver(again);
    if (box !== null) observer?.observe(box);
    return () => {
      window.removeEventListener('resize', resized);
      observer?.disconnect();
    };
  }, [header, foldedAt, setFolded]);
}

// `inside`: an element whose parent is the header; `items`: changes when its items may.
export function useHeaderFold(inside: RefObject<HTMLElement | null>, items: string): boolean {
  const [folded, setFolded] = useState(false);
  const foldedAt = useRef(0);
  const header = useRef<HTMLElement | null>(null);
  // New items: try one row again.
  useLayoutEffect(() => {
    setFolded(false);
  }, [items]);
  // Before the browser paints: one row, or fold.
  useLayoutEffect(() => {
    const bar = inside.current?.parentElement ?? null;
    header.current = bar;
    if (bar === null) return;
    bar.dataset['skFolded'] = String(folded);
    if (!folded && wraps(bar)) {
      foldedAt.current = window.innerWidth;
      setFolded(true);
    }
  });
  useRecheck(header, foldedAt, setFolded);
  return folded;
}
