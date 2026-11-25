/**
 * @file   src/server/health.test.ts
 * @brief  The readiness answer: ready, unavailable, late, and nothing leaked (K64).
 *
 * Responsibility: a probe that answers gives 200 `{ status: 'ready' }`; one that rejects, or does
 *                 not answer within `timeoutMs`, gives 503 `{ status: 'unavailable', reason:
 *                 'database' }` with the error beside the body and never in it; `extra` fields
 *                 join a ready body and an `extra` that throws makes it unavailable; a bad
 *                 timeout is refused; the route names are the two the games share.
 * Depends on:     vitest
 * Source:         new in the kit (K64).
 */
import { describe, expect, it } from 'vitest';

import { HEALTH_PATHS, readiness } from './health.js';

describe('readiness', () => {
  it('is 200 ready when the probe answers', async () => {
    expect(await readiness(() => Promise.resolve(1))).toEqual({
      code: 200,
      body: { status: 'ready' },
    });
  });

  it('is 503 unavailable when the probe fails, the error beside the body', async () => {
    const boom = new Error('password authentication failed for user "x"');
    const answer = await readiness(() => Promise.reject(boom));
    expect(answer.code).toBe(503);
    expect(answer.body).toEqual({ status: 'unavailable', reason: 'database' });
    expect(answer.error).toBe(boom);
    expect(JSON.stringify(answer.body)).not.toContain('password');
  });

  it('is 503 when the probe is later than the limit', async () => {
    const answer = await readiness(() => new Promise<never>(() => undefined), { timeoutMs: 20 });
    expect(answer.code).toBe(503);
    expect((answer.error as Error).message).toMatch(/timed out after 20ms/);
  });

  it('adds the extra fields to a ready body', async () => {
    const answer = await readiness(() => Promise.resolve(), {
      extra: () => Promise.resolve({ websiteFeed: { lastSuccessAt: null } }),
    });
    expect(answer.body).toEqual({ status: 'ready', websiteFeed: { lastSuccessAt: null } });
  });

  it('is unavailable when the extra fails, and not asked when the probe failed', async () => {
    const failing = await readiness(() => Promise.resolve(), {
      extra: () => Promise.reject(new Error('feed')),
    });
    expect(failing.code).toBe(503);
    let asked = false;
    await readiness(() => Promise.reject(new Error('down')), {
      extra: () => {
        asked = true;
        return Promise.resolve({});
      },
    });
    expect(asked).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a timeout of %s', async (timeoutMs) => {
    await expect(readiness(() => Promise.resolve(), { timeoutMs })).rejects.toThrow(RangeError);
  });

  it('names the two routes the games share', () => {
    expect(HEALTH_PATHS).toEqual({ live: '/healthz', ready: '/readyz' });
  });
});
