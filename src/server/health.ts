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
export const HEALTH_PATHS = { live: '/healthz', ready: '/readyz' } as const;

export interface ReadinessOptions {
  // Whole milliseconds, ≥ 1: how long the probe may take. Default 1500.
  readonly timeoutMs?: number;
  // Fields added to a ready body.
  readonly extra?: () => Promise<Readonly<Record<string, unknown>>>;
}

export interface ReadinessAnswer {
  readonly code: 200 | 503;
  readonly body: Readonly<Record<string, unknown>>;
  // Why it is not ready, for the game's log; never in the body.
  readonly error?: unknown;
}

// Rejects after `ms`; the timer is cleared as soon as the probe settles.
function limit<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`the readiness probe timed out after ${String(ms)}ms`));
    }, ms);
  });
  return Promise.race([work, late]).finally(() => {
    clearTimeout(timer);
  });
}

export async function readiness(
  probe: () => Promise<unknown>,
  options: ReadinessOptions = {},
): Promise<ReadinessAnswer> {
  const timeoutMs = options.timeoutMs ?? 1_500;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError('timeoutMs is a whole number of milliseconds, at least 1');
  }
  try {
    await limit(probe(), timeoutMs);
    const extra = options.extra === undefined ? {} : await limit(options.extra(), timeoutMs);
    return { code: 200, body: { status: 'ready', ...extra } };
  } catch (error) {
    return { code: 503, body: { status: 'unavailable', reason: 'database' }, error };
  }
}
