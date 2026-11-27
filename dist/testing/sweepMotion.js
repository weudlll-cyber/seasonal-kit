export const MOTION_LIMIT_MS = 5000;
// So long must nothing move before the screen counts as still.
export const MOTION_QUIET_MS = 250;
// Null when the screen is still; else what was moving when the limit was reached.
export async function motionEnded(page) {
    return page.evaluate(async ([limit, quiet]) => {
        if (typeof document.getAnimations !== 'function')
            return null;
        const moving = () => document
            .getAnimations()
            .filter((a) => (a.playState === 'running' || a.pending) &&
            a.effect?.getComputedTiming().endTime !== Infinity);
        const named = (a) => {
            const part = a.effect?.target;
            if (part === null || part === undefined)
                return 'an animation';
            return [part.tagName.toLowerCase(), ...[...part.classList].slice(0, 1)].join('.');
        };
        const start = Date.now();
        let calmSince = start;
        let now = moving();
        while (now.length > 0 || Date.now() - calmSince < quiet) {
            if (now.length > 0)
                calmSince = Date.now();
            if (Date.now() - start >= limit) {
                return now.length > 0 ? now.map(named).join(', ') : 'animations kept starting';
            }
            await new Promise((done) => setTimeout(done, 50));
            now = moving();
        }
        return null;
    }, [MOTION_LIMIT_MS, MOTION_QUIET_MS]);
}
