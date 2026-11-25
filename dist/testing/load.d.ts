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
export declare function latencies(values: readonly number[]): Latencies;
export declare function inBatches<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>): Promise<R[]>;
export interface WatchOptions {
    readonly url: string;
    readonly prefix: string;
    readonly everyMs?: number;
    readonly fetch?: typeof fetch;
}
export interface ServerLoad {
    readonly samples: number;
    readonly cpuPeakCores: number | null;
    readonly cpuMeanCores: number | null;
    readonly rssPeakMiB: number | null;
    readonly loopLagP99PeakMs: number | null;
}
export declare function watchServer(options: WatchOptions): {
    readonly stop: () => Promise<ServerLoad>;
};
