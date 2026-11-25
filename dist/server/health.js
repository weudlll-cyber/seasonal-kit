/**
 * @file   src/server/health.ts
 * @brief  The health routes' names and the readiness answer, the same in every game.
 *
 * Responsibility: `HEALTH_PATHS` settles the names: `/healthz` (liveness: the process is up, the
 *                 answer is `{ status: 'ok' }` and nothing is asked) and `/readyz` (readiness).
 *                 `readiness(probe, options)` runs the game's probe (a database ping) against a
 *                 time limit (1.5 s) and gives `{ code, body, error? }`: 200 and
 *                 `{ status: 'ready' }` when the probe answers in time, else 503 and
 *                 `{ status: 'unavailable', reason: 'database' }`. The body never carries the
 *                 error; it is returned beside it for the game to log. `extra` adds fields to a
 *                 ready body (Mini Games' website-feed time); if it throws the answer is
 *                 unavailable too. A public route that asks the database should be limited per
 *                 address: the limit, the route registration and the probe stay in the game.
 * Source:         seasonal-bingo-royale apps/server/src/http/routes/health.ts at 8d20904 (the
 *                 answer and the 1.5 s limit; its per-address limit stays there) and
 *                 seasonal-mini-games the same path at 9e3c6f3 (`extra`). Seasonal Cases'
 *                 `healthRoutes.ts` at 073f9ad uses `/api/health` and `/api/ready` with other
 *                 bodies: it moves to these names when it adopts, and its installer's probe too.
 * Spec:           docs/concepts/shared-server-parts.md §5
 */
export const HEALTH_PATHS = { live: '/healthz', ready: '/readyz' };
// Rejects after `ms`; the timer is cleared as soon as the probe settles.
function limit(work, ms) {
    let timer;
    const late = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`the readiness probe timed out after ${String(ms)}ms`));
        }, ms);
    });
    return Promise.race([work, late]).finally(() => {
        clearTimeout(timer);
    });
}
export async function readiness(probe, options = {}) {
    const timeoutMs = options.timeoutMs ?? 1_500;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
        throw new RangeError('timeoutMs is a whole number of milliseconds, at least 1');
    }
    try {
        await limit(probe(), timeoutMs);
        const extra = options.extra === undefined ? {} : await limit(options.extra(), timeoutMs);
        return { code: 200, body: { status: 'ready', ...extra } };
    }
    catch (error) {
        return { code: 503, body: { status: 'unavailable', reason: 'database' }, error };
    }
}
