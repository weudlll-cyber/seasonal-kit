/**
 * @file   src/testing/load.test.ts
 * @brief  The load check's measuring helpers (K73).
 *
 * Responsibility: nearest-rank percentiles (the p50 of two values is the smaller) and null without
 *                 values; batches of the given size, results in order, a bad size refused; and the
 *                 server watch: CPU from the rise between reads, peaks in MiB and ms, missing or
 *                 unreadable pages skipped, nothing measured gives null, and a stop returns at once.
 * Depends on:     vitest
 * Source:         new in the kit (K73).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inBatches, latencies, watchServer } from './load.js';

describe('latencies', () => {
  it('takes the nearest rank', () => {
    expect(latencies([20, 10])).toEqual({ n: 2, p50: 10, p95: 20, p99: 20, max: 20 });
    const hundred = Array.from({ length: 100 }, (_, i) => 100 - i);
    expect(latencies(hundred)).toEqual({ n: 100, p50: 50, p95: 95, p99: 99, max: 100 });
  });

  it('is null without values', () => {
    expect(latencies([])).toEqual({ n: 0, p50: null, p95: null, p99: null, max: null });
  });
});

describe('inBatches', () => {
  it('runs at most the size at a time and keeps the order', async () => {
    let running = 0;
    let most = 0;
    const results = await inBatches([1, 2, 3, 4, 5], 2, async (x) => {
      running += 1;
      most = Math.max(most, running);
      await Promise.resolve();
      running -= 1;
      return x * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(most).toBe(2);
  });

  it.each([0, -1, 1.5])('refuses a batch of %s', async (size) => {
    await expect(inBatches([1], size, (x) => Promise.resolve(x))).rejects.toThrow(RangeError);
  });
});

const page = (cpu: number, rss: number, lag: number): string =>
  [
    '# HELP sbr_process_cpu_seconds_total x',
    `sbr_process_cpu_seconds_total ${String(cpu)}`,
    `sbr_process_resident_memory_bytes ${String(rss)}`,
    `sbr_nodejs_eventloop_lag_p99_seconds ${String(lag)}`,
  ].join('\n');

describe('watchServer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('measures the rise between reads and the peaks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const pages = [page(1, 100 * 1_048_576, 0.5), 'broken', page(5, 200 * 1_048_576, 0.012)];
    const send = vi.fn(() => {
      const next = pages.shift();
      return next === undefined
        ? Promise.reject(new Error('gone'))
        : Promise.resolve(new Response(next));
    });
    const watch = watchServer({ url: 'http://x/metrics', prefix: 'sbr_', fetch: send });
    await vi.advanceTimersByTimeAsync(8_000);
    const load = await watch.stop();
    // Four CPU seconds in the four seconds between the two readable pages.
    expect(load).toEqual({
      samples: 1,
      cpuPeakCores: 1,
      cpuMeanCores: 1,
      rssPeakMiB: 200,
      loopLagP99PeakMs: 12,
    });
    expect(send.mock.calls[0]).toEqual(['http://x/metrics']);
  });

  it('gives nulls with nothing measured, and stops at once', async () => {
    const send = vi.fn(() => Promise.resolve(new Response('other_metric 1')));
    const watch = watchServer({
      url: 'u',
      prefix: 'sbr_',
      everyMs: 60_000,
      fetch: send,
    });
    const load = await watch.stop();
    expect(load).toEqual({
      samples: 0,
      cpuPeakCores: null,
      cpuMeanCores: null,
      rssPeakMiB: null,
      loopLagP99PeakMs: null,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
