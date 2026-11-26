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
 *                 mode) folds at 1280 px. Before it folds, the account's step badges give way
 *                 (since v0.33.0, `data-sk-steps`): all of them, then only the first, then none
 *                 in the bar; the fold is the last resort, and the folded menu shows all. A
 *                 render never reads the window: the first one is
 *                 unfolded and the layout effect decides before the paint.
 *                 A game may also pass `foldBelow` (since v0.13.0, Bingo's wish, K40): under that
 *                 window width the header is always folded, on top of the measure; from it up
 *                 the measure decides. Without it nothing changes.
 * Source:         seasonal-bingo-royale apps/web/src/shell/useBarFold.ts at 5c613c0 (its
 *                 `wraps`, the fold before paint), without its fixed 960 px; the fonts as
 *                 ../fit.ts watches them.
 */
import { type RefObject } from 'react';
export declare function useHeaderFold(inside: RefObject<HTMLElement | null>, items: string, foldBelow?: number): boolean;
