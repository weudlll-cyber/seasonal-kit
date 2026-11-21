/**
 * @file   src/fit.ts
 * @brief  Fitting a screen to the space it has: its scale `--fit`, and each game's floors.
 *
 * Responsibility: a screen (its root) names its fixed parts (`[data-fit-fixed]`, else all its
 *                 children). The space they have is the nearest box that clips or scrolls, or
 *                 the root's own box (`self`). `settle` finds the largest scale ≤ 1 at which the
 *                 fixed parts fit, never below the game's scale floor. It sets it on the root as
 *                 the CSS custom property `--fit`, which the screen's sizes multiply, each with
 *                 its own readable floor (../css/fit.css), and as `data-fit-scale` for tests.
 *                 Where there is room the scale is 1 and the screen looks as without it.
 *                 `watchFit` fits again when the box's size or the visual viewport changes, in
 *                 the next frame, never inside the observer's own delivery, so nothing loops.
 *                 `FIT_FLOORS` holds each game's floors. They never go below what the game has
 *                 today (DECISIONS K14), and tests/fit-floors.test.ts enforces that and keeps
 *                 ../css/fit.css equal to them.
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts at 866df03 (O111: `nextScale`,
 *                 `settle`, the measuring, the effect's watching, without React); the Bingo
 *                 floors from seasonal-bingo-royale apps/web/src/minTextSize.test.ts at a43209a.
 * Spec:           Mini Games DECISIONS O111; Bingo docs/concepts/fit-audit.md; kit DECISIONS K14
 */
export const FIT_FLOORS = {
    // O111: 13 px body text, 24 px display values, 22 px rows, 40 px phone touch targets; its
    // round bar's unread badge is 12 px (focus.css).
    'mini-games': { scale: 0.6, text: 13, display: 24, row: 22, target: 40, badge: 12 },
    // No screen scale today (its screens fit by layout, fit audit), 14 px text, 44 px targets.
    bingo: { scale: 1, text: 14, display: 24, row: 22, target: 44, badge: 14 },
};
// The passes of one fitting after the first measurement: each halves the gap left.
const PASSES = 7;
// The next scale from one measurement: the fixed parts took `used` pixels of `room` at the
// scale `current`; they shrink about in proportion, so the largest scale ≤ 1 that fits, a
// little under it to stay inside (never below the floor). Already fitting: `current` stays.
export function nextScale(current, used, room, floor) {
    if (used <= room + 0.5 || used <= 0 || room <= 0)
        return current;
    const next = Math.min(1, (current * room) / used) - 0.005;
    return Math.max(floor, Math.round(next * 1000) / 1000);
}
// The box the screen's fixed parts must fit: the root itself when it clips or scrolls, else
// the nearest such ancestor.
export function boxOf(root) {
    for (let e = root; e !== null; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.overflowY !== 'visible' && s.overflowY !== '')
            return e;
    }
    return document.documentElement;
}
// What a fixed part holds beyond its own box: the most any box in it (itself included) that
// clips or scrolls has hidden.
function hidden(part) {
    let most = 0;
    for (const e of [part, ...part.querySelectorAll('*')]) {
        const over = e.scrollHeight - e.clientHeight;
        if (over > 1 && getComputedStyle(e).overflowY !== 'visible')
            most = Math.max(most, over);
    }
    return most;
}
// How far the fixed parts reach in the box's content, from its top edge, and the box's room.
function measure(root, box) {
    const marked = root.querySelectorAll('[data-fit-fixed]');
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
export function settle(root, box, floor) {
    const fits = (scale) => {
        root.style.setProperty('--fit', String(scale));
        const { used, room } = measure(root, box);
        return used <= room + 0.5;
    };
    let scale = 1;
    if (floor < 1 && !fits(1)) {
        const first = measure(root, box);
        let low = floor;
        let high = 1;
        let guess = nextScale(1, first.used, first.room, floor);
        for (let pass = 0; pass < PASSES && high - low > 0.01; pass += 1) {
            if (fits(guess))
                low = guess;
            else
                high = guess;
            guess = Math.round(((low + high) / 2) * 1000) / 1000;
        }
        scale = low;
    }
    root.style.setProperty('--fit', String(scale));
    root.dataset['fitScale'] = String(scale);
    return scale;
}
const sizeOf = (box) => `${String(box.clientWidth)}x${String(box.clientHeight)}`;
// Fits the screen now and again on each new size of its box or of the visual viewport (a
// phone's keyboard); the scale's own change of the root's height is not watched. Returns the
// stop. `self`: the root fills a height of its own, so its own box is the one to fit.
export function watchFit(root, game, self = false) {
    const floor = FIT_FLOORS[game].scale;
    const box = self ? root : boxOf(root);
    settle(root, box, floor);
    let size = sizeOf(box);
    let frame = 0;
    const resized = () => {
        const now = sizeOf(box);
        if (now === size)
            return;
        size = now;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            settle(root, box, floor);
        });
    };
    // Browsers only; a test's DOM may have no ResizeObserver.
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resized);
    watch?.observe(box);
    window.visualViewport?.addEventListener('resize', resized);
    return () => {
        cancelAnimationFrame(frame);
        watch?.disconnect();
        window.visualViewport?.removeEventListener('resize', resized);
    };
}
