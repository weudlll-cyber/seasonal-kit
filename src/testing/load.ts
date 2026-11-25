/**
 * @file   src/testing/load.ts
 * @brief  What every load check measures: latency percentiles, work in batches, and the server's
 *         CPU, memory and event-loop lag from its /metrics.
 *
 * Responsibility: `latencies(values)` gives the count, p50, p95, p99 (nearest rank) and the
 *                 largest, null without values. `inBatches(items, size, work)` runs the work for
 *                 `size` items at a time and returns the results in order. `watchServer(options)`
 *                 reads a prom-client `/metrics` page every 2 s, one request at a time (a slow
 *                 answer skips a beat), and `stop()` gives the peak and mean CPU in cores, the
 *                 peak resident memory in MiB and the peak event-loop lag p99 in ms over the
 *                 samples between two reads, null where there were none. Scenarios, targets and
 *                 sign-in stay in each game.
 * Depends on:     nothing (Node's fetch)
 * Source:         seasonal-bingo-royale load/common.mjs (`inBatches`, the percentiles, the
 *                 sampler) at 8d20904 and seasonal-mini-games load/measure.mjs
 *                 (`metricsSampler`'s summary) at 9e3c6f3. The percentile is Bingo's nearest rank:
 *                 Mini Games' rounds up by one (the p50 of two values was the larger). The
 *                 metrics' prefix is a parameter (K73).
 */
export interface Latencies {
  readonly n: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
  readonly max: number | null;
}

export function latencies(values: readonly number[]): Latencies {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number): number | null =>
    sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? null;
  return {
    n: sorted.length,
    p50: at(50),
    p95: at(95),
    p99: at(99),
    max: sorted.at(-1) ?? null,
  };
}

export async function inBatches<T, R>(
  items: readonly T[],
  size: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('a batch holds at least one item');
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  }
  return out;
}

export interface WatchOptions {
  // The server's metrics page, e.g. `http://127.0.0.1:3000/metrics`.
  readonly url: string;
  // The game's metric prefix, e.g. `sbr_`.
  readonly prefix: string;
  readonly everyMs?: number;
  // Tests: the fetch to use.
  readonly fetch?: typeof fetch;
}

export interface ServerLoad {
  readonly samples: number;
  readonly cpuPeakCores: number | null;
  readonly cpuMeanCores: number | null;
  readonly rssPeakMiB: number | null;
  readonly loopLagP99PeakMs: number | null;
}

interface Reading {
  readonly at: number;
  readonly cpu: number;
  readonly rss: number;
  readonly lag: number;
}

// One read of the metrics, or null when the page or a value is missing.
async function read(options: WatchOptions): Promise<Reading | null> {
  try {
    const text = await (await (options.fetch ?? fetch)(options.url)).text();
    const value = (name: string): number =>
      Number(new RegExp(`^${options.prefix}${name} ([0-9.e+-]+)`, 'm').exec(text)?.[1]);
    const reading = {
      at: Date.now(),
      cpu: value('process_cpu_seconds_total'),
      rss: value('process_resident_memory_bytes'),
      lag: value('nodejs_eventloop_lag_p99_seconds'),
    };
    return Object.values(reading).every(Number.isFinite) ? reading : null;
  } catch {
    return null;
  }
}

function summed(readings: readonly Reading[]): ServerLoad {
  // CPU is a running total: each sample is the rise between two reads.
  const cores = readings.slice(1).map((now, i) => {
    const last = readings[i] ?? now;
    return (now.cpu - last.cpu) / Math.max(0.001, (now.at - last.at) / 1000);
  });
  const later = readings.slice(1);
  const peak = (list: readonly number[]): number | null =>
    list.length === 0 ? null : Math.max(...list);
  const round = (x: number | null, by: number): number | null =>
    x === null ? null : Math.round(x * by) / by;
  const mean = cores.length === 0 ? null : cores.reduce((a, b) => a + b, 0) / cores.length;
  return {
    samples: cores.length,
    cpuPeakCores: round(peak(cores), 100),
    cpuMeanCores: round(mean, 100),
    rssPeakMiB: round(peak(later.map((r) => r.rss / 1_048_576)), 1),
    loopLagP99PeakMs: round(peak(later.map((r) => r.lag * 1000)), 1),
  };
}

export function watchServer(options: WatchOptions): { readonly stop: () => Promise<ServerLoad> } {
  const readings: Reading[] = [];
  let running = true;
  let wake = (): void => undefined;
  const loop = async (): Promise<void> => {
    while (running) {
      const reading = await read(options);
      if (reading !== null) readings.push(reading);
      await new Promise<void>((done) => {
        // A stop ends the pause at once.
        const timer = setTimeout(done, options.everyMs ?? 2_000);
        wake = () => {
          clearTimeout(timer);
          done();
        };
        if (!running) wake();
      });
    }
  };
  const done = loop();
  return {
    stop: async () => {
      running = false;
      wake();
      await done;
      return summed(readings);
    },
  };
}
