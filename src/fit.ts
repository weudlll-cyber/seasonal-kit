/**
 * @file   src/fit.ts
 * @brief  Fitting a screen to the space it has: its scale `--fit`, and each game's floors.
 *
 * Responsibility: a screen (its root) names its fixed parts (`[data-sk-fit-fixed]`, else all its
 *                 children). The space they have is the nearest box that clips or scrolls, or
 *                 the root's own box (`self`). `settle` finds the largest scale ≤ 1 at which the
 *                 fixed parts fit, never below the game's scale floor. It sets it on the root as
 *                 the CSS custom property `--fit`, which the screen's sizes multiply, each with
 *                 its own readable floor (../css/fit.css), and as `data-sk-fit-scale` for tests.
 *                 Where there is room the scale is 1 and the screen looks as without it.
 *                 `watchFit` fits again when the box's size or the visual viewport changes, and,
 *                 when asked (`afterFonts`, since v0.12.0), once web fonts have loaded, in the
 *                 next frame, never inside the observer's own delivery, so nothing loops.
 *                 `FIT_FLOORS` holds each game's floors. They never go below what the game has
 *                 today (DECISIONS K14), and tests/fit-floors.test.ts enforces that and keeps
 *                 ../css/fit.css equal to them. `MIN_POINTER_TARGET` is the 24 px every pointer
 *                 target keeps in every game (WCAG 2.5.8, K33).
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts at 866df03 (O111: `nextScale`,
 *                 `settle`, the measuring, the effect's watching, without React); the Bingo
 *                 floors from seasonal-bingo-royale apps/web/src/minTextSize.test.ts at a43209a.
 * Spec:           Mini Games DECISIONS O111; Bingo docs/concepts/fit-audit.md; kit DECISIONS K14
 */

export type FitGame = 'mini-games' | 'bingo' | 'seasonal-party' | 'cases';

// WCAG 2.5.8 (AA): every pointer target in every game is at least 24 × 24 CSS px, or has that
// much room around it (DECISIONS K33, since v0.11.0). The phone touch-target floors below (40
// and 44 px) stay; this is the least any target anywhere may be. ../css/fit.css has it as
// `--sk-min-target`; the showcase's axe run checks it (`target-size`).
export const MIN_POINTER_TARGET = 24;

export interface FitFloors {
  // The smallest scale; 1 means the game's screens never shrink.
  readonly scale: number;
  // CSS px, each the least its kind of size may become.
  readonly text: number;
  readonly display: number;
  readonly row: number;
  // A touch target on a phone.
  readonly target: number;
  // A count on a button's corner (the bar's unread badge).
  readonly badge: number;
}

export const FIT_FLOORS: Readonly<Record<FitGame, FitFloors>> = {
  // O111: 13 px body text, 24 px display values, 22 px rows, 40 px phone touch targets; its
  // round bar's unread badge is 12 px (focus.css).
  'mini-games': { scale: 0.6, text: 13, display: 24, row: 22, target: 40, badge: 12 },
  // No screen scale today (its screens fit by layout, fit audit), 14 px text, 44 px targets.
  bingo: { scale: 1, text: 14, display: 24, row: 22, target: 44, badge: 14 },
  // Seasonal Party (since v0.11.0) has today: 14 px text (the owner, 2026-11-21) and Mini
  // Games' 0.6 scale on its result frame, which names no game, so the strictest set holds
  // for the rest (seasonal-spirits apps/client/src/frame/ResultCard.tsx at e907de9).
  'seasonal-party': { scale: 0.6, text: 14, display: 24, row: 22, target: 44, badge: 14 },
  // Seasonal Cases (since v0.11.0): 14/24/22/44 px (its CONCEPT §7, pending/fit-cases.css),
  // the 0.6 scale its screens take from `useFitScale('mini-games')`, the default 14 px badge
  // (seasonal-cases proto/cases-v1 at cc75504).
  cases: { scale: 0.6, text: 14, display: 24, row: 22, target: 44, badge: 14 },
};

// The passes of one fitting after the first measurement: each halves the gap left.
const PASSES = 7;

// Tolerances, all from Mini Games' useFit.ts (866df03), named since v0.10.1:
// - FITS_WITHIN_PX: what still counts as fitting. Boxes are laid out in fractions of a pixel
//   and rounded at paint, so content that is 0.5 px over is not seen and must not shrink a
//   screen that has room.
const FITS_WITHIN_PX = 0.5;
// - HIDDEN_OVER_PX: what a clipping box may hide before it counts. scrollHeight is rounded
//   to whole pixels and clientHeight down, so 1 px is rounding, not hidden content.
const HIDDEN_OVER_PX = 1;
// - UNDER_BY: how far below the proportional scale the first guess stays, so it lands inside
//   rather than on the edge.
const UNDER_BY = 0.005;
// - SCALE_STEP: scales are kept to three decimals (a 1000th), finer than a pixel at any size.
const SCALE_STEP = 1000;
// - CLOSE_ENOUGH: the search stops once the largest fitting and the smallest failing scale are
//   within 1 % (a few pixels at most).
const CLOSE_ENOUGH = 0.01;

const rounded = (scale: number): number => Math.round(scale * SCALE_STEP) / SCALE_STEP;

// The next scale from one measurement: the fixed parts took `used` pixels of `room` at the
// scale `current`; they shrink about in proportion, so the largest scale ≤ 1 that fits, a
// little under it to stay inside (never below the floor). Already fitting: `current` stays.
export function nextScale(current: number, used: number, room: number, floor: number): number {
  if (used <= room + FITS_WITHIN_PX || used <= 0 || room <= 0) return current;
  const next = Math.min(1, (current * room) / used) - UNDER_BY;
  return Math.max(floor, rounded(next));
}

// The box the screen's fixed parts must fit: the root itself when it clips or scrolls, else
// the nearest such ancestor.
export function boxOf(root: HTMLElement): HTMLElement {
  for (let e: HTMLElement | null = root; e !== null; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.overflowY !== 'visible' && s.overflowY !== '') return e;
  }
  return document.documentElement;
}

// What a fixed part holds beyond its own box: the most any box in it (itself included) that
// clips or scrolls has hidden.
function hidden(part: Element): number {
  let most = 0;
  for (const e of [part, ...part.querySelectorAll('*')]) {
    const over = e.scrollHeight - e.clientHeight;
    if (over > HIDDEN_OVER_PX && getComputedStyle(e).overflowY !== 'visible')
      most = Math.max(most, over);
  }
  return most;
}

// How far the fixed parts reach in the box's content, from its top edge, and the box's room.
function measure(root: HTMLElement, box: HTMLElement): { used: number; room: number } {
  const marked = root.querySelectorAll<HTMLElement>('[data-sk-fit-fixed]');
  const parts = marked.length > 0 ? [...marked] : [...root.children];
  const b = box.getBoundingClientRect();
  const top = b.top + box.clientTop - box.scrollTop;
  let low = top;
  let high = top;
  for (const part of parts) {
    const r = part.getBoundingClientRect();
    low = Math.min(low, r.top);
    high = Math.max(high, r.bottom + hidden(part));
  }
  const pad = parseFloat(getComputedStyle(box).paddingBottom) || 0;
  return { used: high - low + pad, room: box.clientHeight };
}

// One fitting, from 1 every time: a proportional first guess, then halving the gap between
// the largest scale found to fit and the smallest found not to, so the result is the largest
// that fits (within 1 %) also where some sizes do not shrink. At most nine measurements.
export function settle(root: HTMLElement, box: HTMLElement, floor: number): number {
  const fits = (scale: number): boolean => {
    root.style.setProperty('--fit', String(scale));
    const { used, room } = measure(root, box);
    return used <= room + FITS_WITHIN_PX;
  };
  let scale = 1;
  if (floor < 1 && !fits(1)) {
    const first = measure(root, box);
    let low = floor;
    let high = 1;
    let guess = nextScale(1, first.used, first.room, floor);
    for (let pass = 0; pass < PASSES && high - low > CLOSE_ENOUGH; pass += 1) {
      if (fits(guess)) low = guess;
      else high = guess;
      guess = rounded((low + high) / 2);
    }
    scale = low;
  }
  root.style.setProperty('--fit', String(scale));
  root.dataset['skFitScale'] = String(scale);
  return scale;
}

const sizeOf = (box: HTMLElement): string =>
  `${String(box.clientWidth)}x${String(box.clientHeight)}`;

export interface FitOptions {
  // Fit again once web fonts have loaded (`document.fonts` `loadingdone`, and `fonts.ready` for
  // the load already under way), since text set in a late font changes height without the
  // box's size changing (a WebKit wrap 32 px over the card, Mini Games T404). Off by default:
  // a game that names nothing is fitted exactly as before (since v0.12.0).
  readonly afterFonts?: boolean;
}

// Fits the screen now and again on each new size of its box or of the visual viewport (a
// phone's keyboard), and, with `afterFonts`, once web fonts have loaded; the scale's own change
// of the root's height is not watched. Returns the stop. `self`: the root fills a height of its
// own, so its own box is the one to fit.
export function watchFit(
  root: HTMLElement,
  game: FitGame,
  self = false,
  options: FitOptions = {},
): () => void {
  const floor = FIT_FLOORS[game].scale;
  const box = self ? root : boxOf(root);
  settle(root, box, floor);
  let size = sizeOf(box);
  let frame = 0;
  let live = true;
  // Always in the next frame, never inside the observer's or the font set's own delivery.
  const later = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      settle(root, box, floor);
    });
  };
  const resized = (): void => {
    const now = sizeOf(box);
    if (now === size) return;
    size = now;
    later();
  };
  // Browsers only; a test's DOM may have no ResizeObserver.
  const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resized);
  watch?.observe(box);
  window.visualViewport?.addEventListener('resize', resized);
  // Undefined in a DOM without a font set; a late font changes the text, not the box's size, so
  // this fits again whatever the size is.
  const fonts: FontFaceSet | undefined = options.afterFonts === true ? document.fonts : undefined;
  fonts?.addEventListener('loadingdone', later);
  void fonts?.ready.then(() => {
    if (live) later();
  });
  return () => {
    live = false;
    cancelAnimationFrame(frame);
    watch?.disconnect();
    window.visualViewport?.removeEventListener('resize', resized);
    fonts?.removeEventListener('loadingdone', later);
  };
}
