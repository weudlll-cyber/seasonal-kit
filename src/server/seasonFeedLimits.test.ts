/**
 * @file   src/server/seasonFeedLimits.test.ts
 * @brief  What the season feed reader holds itself, whatever the game's fetch does (the v0.11.0
 *         security pass, findings 1–5).
 *
 * Responsibility: a body over 64 KiB with no length is cut off as it streams and its stream
 *                 cancelled; a refused answer's body is cancelled too; a redirected answer is
 *                 refused; a fetch that ignores the signal, or a body that never ends, ends in
 *                 "timeout"; bytes that are no UTF-8 are named; reads that overlap share one
 *                 request; the options are whole milliseconds; a clock that gives no finite time
 *                 makes the answer stale.
 * Depends on:     vitest
 * Spec:           docs/security-pass.md "2026-11-23 — before v0.11.0"
 */
import { describe, expect, it, vi } from 'vitest';

import { seasonFeedReader } from './seasonFeed.js';

const FEED = {
  v: 1,
  inSeason: { season: 'autumn', token: 'AUTUMN', since: '2026-03-05T22:32:17Z' },
  halvingDays: [{ day: '2026-12-04', token: 'AUTUMN' }],
};

const ORIGIN = 'https://site.example';

// A body of `chunks` 16 KiB pieces, or one that never ends; `cancelled` says if it was cut off.
function stream(chunks: number | 'forever') {
  const seen = { cancelled: false };
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunks === 'forever') return new Promise<void>(() => undefined);
      if (sent === chunks) controller.close();
      else controller.enqueue(new Uint8Array(16 * 1024).fill(32));
      sent += 1;
      return undefined;
    },
    cancel() {
      seen.cancelled = true;
    },
  });
  return { body, seen };
}

const reader = (fetch: () => Promise<Response>, timeoutMs = 50) =>
  seasonFeedReader({ origin: ORIGIN, fetch, timeoutMs });

describe('what the reader holds itself', () => {
  it('cuts a body over 64 KiB off as it streams, with no length given, and cancels it', async () => {
    const { body, seen } = stream(10);
    const s = await reader(() => Promise.resolve(new Response(body))).refresh();
    expect(s.lastError).toBe('too large');
    expect(seen.cancelled).toBe(true);
  });

  it('cancels the body of an answer it refuses, and refuses a redirected one', async () => {
    const { body, seen } = stream(1);
    const refused = reader(() => Promise.resolve(new Response(body, { status: 503 })));
    expect((await refused.refresh()).lastError).toBe('http 503');
    expect(seen.cancelled).toBe(true);
    const moved = new Response(JSON.stringify(FEED));
    Object.defineProperty(moved, 'redirected', { value: true });
    expect((await reader(() => Promise.resolve(moved)).refresh()).lastError).toBe('redirected');
  });

  it('ends in "timeout" when the fetch ignores the signal or the body never ends', async () => {
    const hangs = reader(() => new Promise<Response>(() => undefined));
    expect((await hangs.refresh()).lastError).toBe('timeout');
    const { body } = stream('forever');
    const trickles = reader(() => Promise.resolve(new Response(body)));
    expect((await trickles.refresh()).lastError).toBe('timeout');
  });

  it('names bytes that are no UTF-8', async () => {
    const bad = new Response(new Uint8Array([0x7b, 0xff, 0x7d]));
    expect((await reader(() => Promise.resolve(bad)).refresh()).lastError).toBe('not utf-8');
    // No body at all is no JSON either.
    const empty = reader(() => Promise.resolve(new Response(null)));
    expect((await empty.refresh()).lastError).toBe('not json');
  });

  it('shares one request between reads that overlap', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(FEED))));
    const r = reader(fetch);
    const [a, b] = await Promise.all([r.refresh(), r.refresh()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    await r.refresh();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('the reader’s options and clock', () => {
  it('takes whole milliseconds of 1 or more only', () => {
    const fetch = () => Promise.reject(new Error('unused'));
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => seasonFeedReader({ origin: ORIGIN, fetch, timeoutMs: bad })).toThrow(RangeError);
      expect(() => seasonFeedReader({ origin: ORIGIN, fetch, staleAfterMs: bad })).toThrow(
        RangeError,
      );
    }
  });

  it('calls an answer stale when the clock gives no finite time', async () => {
    let clock = 0;
    const r = seasonFeedReader({
      origin: ORIGIN,
      fetch: () => Promise.resolve(new Response(JSON.stringify(FEED))),
      now: () => clock,
    });
    expect((await r.refresh()).stale).toBe(false);
    clock = Number.NaN;
    expect(r.state().stale).toBe(true);
  });
});
