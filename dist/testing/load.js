export function latencies(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? null;
    return {
        n: sorted.length,
        p50: at(50),
        p95: at(95),
        p99: at(99),
        max: sorted.at(-1) ?? null,
    };
}
export async function inBatches(items, size, work) {
    if (!Number.isInteger(size) || size < 1)
        throw new RangeError('a batch holds at least one item');
    const out = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
    }
    return out;
}
// One read of the metrics, or null when the page or a value is missing.
async function read(options) {
    try {
        const text = await (await (options.fetch ?? fetch)(options.url)).text();
        const value = (name) => Number(new RegExp(`^${options.prefix}${name} ([0-9.e+-]+)`, 'm').exec(text)?.[1]);
        const reading = {
            at: Date.now(),
            cpu: value('process_cpu_seconds_total'),
            rss: value('process_resident_memory_bytes'),
            lag: value('nodejs_eventloop_lag_p99_seconds'),
        };
        return Object.values(reading).every(Number.isFinite) ? reading : null;
    }
    catch {
        return null;
    }
}
function summed(readings) {
    // CPU is a running total: each sample is the rise between two reads.
    const cores = readings.slice(1).map((now, i) => {
        const last = readings[i] ?? now;
        return (now.cpu - last.cpu) / Math.max(0.001, (now.at - last.at) / 1000);
    });
    const later = readings.slice(1);
    const peak = (list) => list.length === 0 ? null : Math.max(...list);
    const round = (x, by) => x === null ? null : Math.round(x * by) / by;
    const mean = cores.length === 0 ? null : cores.reduce((a, b) => a + b, 0) / cores.length;
    return {
        samples: cores.length,
        cpuPeakCores: round(peak(cores), 100),
        cpuMeanCores: round(mean, 100),
        rssPeakMiB: round(peak(later.map((r) => r.rss / 1_048_576)), 1),
        loopLagP99PeakMs: round(peak(later.map((r) => r.lag * 1000)), 1),
    };
}
export function watchServer(options) {
    const readings = [];
    let running = true;
    let wake = () => undefined;
    const loop = async () => {
        while (running) {
            const reading = await read(options);
            if (reading !== null)
                readings.push(reading);
            await new Promise((done) => {
                // A stop ends the pause at once.
                const timer = setTimeout(done, options.everyMs ?? 2_000);
                wake = () => {
                    clearTimeout(timer);
                    done();
                };
                if (!running)
                    wake();
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
