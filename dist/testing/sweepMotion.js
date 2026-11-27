import { needsNumber } from './decision.js';
export const MOTION_LIMIT_MS = 5000;
// So long must nothing move before the screen counts as still.
export const MOTION_QUIET_MS = 250;
// The words for a screen that did not come to rest, in the sweep's finding and settle's error.
export const stillMoving = (moving) => `still moving after ${String(MOTION_LIMIT_MS / 1000)} s: ${moving}`;
// So long between two looks at the page.
const STEP_MS = 50;
// In the page: what still moves, by name, those declared apart; null where the page cannot list
// its animations. It only reads: no clock and no timer of the page's own, which a test may hold.
function stillRunning(excused) {
    if (typeof document.getAnimations !== 'function')
        return null;
    const partOf = (a) => a.effect?.target ?? null;
    const named = (a) => {
        const part = partOf(a);
        if (part === null)
            return 'an animation';
        return [part.tagName.toLowerCase(), ...[...part.classList].slice(0, 1)].join('.');
    };
    return document
        .getAnimations()
        .filter((a) => (a.playState === 'running' || a.pending) &&
        a.effect?.getComputedTiming().endTime !== Infinity &&
        !excused.some((selector) => partOf(a)?.closest(selector)))
        .map(named);
}
// Null when the screen is still; else what was moving when the limit was reached. The limit, the
// quiet moment and the steps are measured here, in the test's process.
export async function motionEnded(page, meant = []) {
    for (const m of meant) {
        needsNumber(`the intended motion of "${m.selector}"`, m.decision);
    }
    const excused = meant.map((m) => m.selector);
    const start = Date.now();
    let calmSince = start;
    for (;;) {
        const moving = await page.evaluate(stillRunning, excused);
        if (moving === null)
            return null;
        const now = Date.now();
        if (moving.length > 0)
            calmSince = now;
        else if (now - calmSince >= MOTION_QUIET_MS)
            return null;
        if (now - start >= MOTION_LIMIT_MS) {
            return moving.length > 0 ? moving.join(', ') : 'animations kept starting';
        }
        await new Promise((done) => setTimeout(done, STEP_MS));
    }
}
