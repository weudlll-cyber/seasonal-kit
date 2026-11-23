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
 *                 A game may also pass `foldBelow` (since v0.13.0, Bingo's wish, K40): under that
 *                 window width the header is always folded, on top of the measure; from it up
 *                 the measure decides. Without it nothing changes.
 * Source:         seasonal-bingo-royale apps/web/src/shell/useBarFold.ts at 5c613c0 (its
 *                 `wraps`, the fold before paint, `foldedAt`), without its fixed 960 px.
 */
import { type RefObject } from 'react';
export declare function useHeaderFold(inside: RefObject<HTMLElement | null>, items: string, foldBelow?: number): boolean;
