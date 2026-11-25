/**
 * @file   src/server/feedEdges.test.ts
 * @brief  The edges of the open-rounds page and the season feed that mutation testing found
 *         unguarded: each test below fails if the line it names is changed (night audit
 *         2026-11-25, piece 3).
 *
 * Responsibility: the open-rounds checks at their limits (an id of 64, a title cut at 80 never
 *                 through a character, counts of 0 and 1, a join address of another origin, a
 *                 sign-up closing exactly now); the season feed's fields at theirs (each season,
 *                 the shapes of an instant and a day, 64 halvings, the same day twice, an object
 *                 where an array is wanted) and the reader's (a body of exactly 64 KiB, in chunks,
 *                 a refusal without a body, a timeout and a stale age of 1 ms, the stale line, the
 *                 request aborted when it is late, no timer left behind).
 * Depends on:     vitest
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  openRoundsPage,
  type OpenRound,
  type OpenRoundDrop,
  type OpenRoundInput,
} from './openRounds.js';
import { parseSeasonFeed, seasonFeedReader } from './seasonFeed.js';

afterEach(() => {
  vi.useRealTimers();
});

const ORIGIN = 'https://site.example';
const ROUND: OpenRoundInput = {
  id: 'r1',
  title: 'Winter round',
  kind: 'Seasonal Bingo Royale',
  startsAt: null,
  signupClosesAt: null,
  players: 0,
  maxPlayers: null,
  joinUrl: `${ORIGIN}/games/bingo/`,
};

// What the page does with one round: the round it lists, or why it dropped it.
function page(
  round: Partial<OpenRoundInput>,
  now = 1_000,
): OpenRound | OpenRoundDrop | typeof listed {
  const drops: OpenRoundDrop[] = [];
  const out = openRoundsPage([{ ...ROUND, ...round }], {
    origin: ORIGIN,
    now,
    onDrop: (_id, why) => drops.push(why),
  });
  return drops[0] ?? out.rounds[0] ?? listed;
}
const listed = Symbol('nothing listed');

describe('the open-rounds checks at their limits', () => {
  it('takes an id of 64 characters and refuses 65 and a blank one', () => {
    expect(page({ id: 'a'.repeat(64) })).toMatchObject({ id: 'a'.repeat(64) });
    expect(page({ id: 'a'.repeat(65) })).toBe('id');
    expect(page({ id: '  ' })).toBe('id');
  });

  it('cuts a title at 80 and a kind at 40, never through a character', () => {
    const high = String.fromCharCode(0xd83d);
    const low = String.fromCharCode(0xde00);
    expect(page({ title: 'a'.repeat(81) })).toMatchObject({ title: 'a'.repeat(80) });
    // A half left at the end goes too, whichever end of the high range it is.
    for (const code of [0xd800, 0xd83d, 0xdbff]) {
      const title = 'a'.repeat(79) + String.fromCharCode(code) + low + 'b';
      expect(page({ title })).toMatchObject({ title: 'a'.repeat(79) });
    }
    // Not a half: the code before the range, and a low half, stay.
    for (const code of [0xd7ff, 0xdc00]) {
      const title = 'a'.repeat(79) + String.fromCharCode(code) + 'bc';
      expect(page({ title })).toMatchObject({ title: 'a'.repeat(79) + String.fromCharCode(code) });
    }
    // A text of exactly the limit is left whole, even one that ends in a high half.
    const whole = 'a'.repeat(79) + high;
    expect(page({ title: whole })).toMatchObject({ title: whole });
    expect(page({ kind: 'k'.repeat(41) })).toMatchObject({ kind: 'k'.repeat(40) });
  });

  it('takes counts of 0 players and 1 as most, refuses the rest', () => {
    expect(page({ players: 0, maxPlayers: 1 })).toMatchObject({ players: 0, maxPlayers: 1 });
    for (const bad of [{ players: -1 }, { players: 1.5 }, { maxPlayers: 0 }, { maxPlayers: 1.5 }]) {
      expect(page(bad)).toBe('count');
    }
  });

  it('refuses a join address of another origin, scheme or none, and a blank title', () => {
    for (const joinUrl of ['http://site.example/x', 'https://other.example/x', 'x', '']) {
      expect(page({ joinUrl })).toBe('joinUrl');
    }
    expect(page({ title: '   ' })).toBe('title');
  });

  it('drops a sign-up closing now or before, and keeps one closing after', () => {
    const at = (ms: number) => new Date(ms).toISOString();
    expect(page({ signupClosesAt: at(1_000) }, 1_000)).toBe('closed');
    expect(page({ signupClosesAt: at(999) }, 1_000)).toBe('closed');
    expect(page({ signupClosesAt: at(1_001) }, 1_000)).toMatchObject({ signupClosesAt: at(1_001) });
    expect(page({ startsAt: 'tomorrow' })).toBe('time');
  });
});

const GOOD = {
  v: 1,
  inSeason: { season: 'autumn', token: 'AUTUMN', since: '2026-03-05T22:32:17Z' },
  halvingDays: [{ day: '2026-12-04', token: 'AUTUMN' }],
};
const withIn = (patch: object) => ({ ...GOOD, inSeason: { ...GOOD.inSeason, ...patch } });
const days = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    day: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    token: 'WINTER',
  }));

describe('the season feed at the edges of its fields', () => {
  it('takes each of the four seasons with its token', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const token = season.toUpperCase();
      expect(parseSeasonFeed(withIn({ season, token }))?.inSeason).toMatchObject({ season, token });
    }
  });

  it('refuses a season or token that is not exactly one of the four', () => {
    for (const patch of [
      { season: 'Autumn' },
      { season: 'fall' },
      { season: 3 },
      { token: 'autumn' },
      { token: 'FALL' },
      { token: 3 },
    ]) {
      expect(parseSeasonFeed(withIn(patch))).toBeNull();
    }
  });

  it('takes an instant with or without milliseconds, and nothing that only looks like one', () => {
    for (const since of [
      '2026-03-05T22:32:17Z',
      '2026-03-05T22:32:17.000Z',
      '2026-03-05T22:32:17.250Z',
    ]) {
      expect(parseSeasonFeed(withIn({ since }))).not.toBeNull();
    }
    for (const since of [
      '2026-02-30T00:00:00Z',
      '2026-03-05T22:32:17.5Z',
      'x2026-03-05T22:32:17Z',
      '2026-03-05T22:32:17Zx',
      '2026-03-05',
      20260305,
      null,
    ]) {
      expect(parseSeasonFeed(withIn({ since }))).toBeNull();
    }
  });
});

describe('the season feed, days and lists', () => {
  it('takes a real day, and nothing that only looks like one', () => {
    const feed = (day: unknown) => ({ ...GOOD, halvingDays: [{ day, token: 'AUTUMN' }] });
    expect(parseSeasonFeed(feed('2026-12-04'))).not.toBeNull();
    for (const day of ['2026-02-30', '2026-13-01', 'x2026-12-04', '2026-12-04x', 20261204, null]) {
      expect(parseSeasonFeed(feed(day))).toBeNull();
    }
  });

  it('takes 64 halvings and refuses 65; the same day twice, never an earlier one', () => {
    expect(parseSeasonFeed({ ...GOOD, halvingDays: days(64) })?.halvingDays).toHaveLength(64);
    expect(parseSeasonFeed({ ...GOOD, halvingDays: days(65) })).toBeNull();
    const twice = [days(1)[0], days(1)[0]];
    expect(parseSeasonFeed({ ...GOOD, halvingDays: twice })?.halvingDays).toHaveLength(2);
    expect(parseSeasonFeed({ ...GOOD, halvingDays: days(2).reverse() })).toBeNull();
  });

  it('refuses an array, null or a string where an object is wanted', () => {
    for (const bad of [[], null, 'x', 5]) {
      expect(parseSeasonFeed({ ...GOOD, inSeason: bad })).toBeNull();
      expect(parseSeasonFeed({ ...GOOD, halvingDays: [bad] })).toBeNull();
      expect(parseSeasonFeed(bad)).toBeNull();
    }
    expect(parseSeasonFeed({ ...GOOD, halvingDays: {} })).toBeNull();
  });
});

type Fetch = NonNullable<Parameters<typeof seasonFeedReader>[0]>['fetch'];
const json = (text: string, init?: ResponseInit) => Promise.resolve(new Response(text, init));
// The good feed as JSON, padded with spaces to `bytes` bytes.
const padded = (bytes: number): string => JSON.stringify(GOOD).padEnd(bytes, ' ');
const reader = (fetch: Fetch, extra: object = {}) =>
  seasonFeedReader({ origin: ORIGIN, fetch, ...extra });

describe('the reader at its limits', () => {
  it('takes a body of exactly 64 KiB, and refuses one byte more', async () => {
    const exact = await reader(() => json(padded(65_536))).refresh();
    expect(exact).toMatchObject({ lastError: null, feed: GOOD });
    const over = await reader(() => json(padded(65_537))).refresh();
    expect(over).toMatchObject({ feed: null, lastError: 'too large' });
  });

  it('reads a body that arrives in chunks, in order', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(GOOD));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 20));
        controller.enqueue(bytes.slice(20));
        controller.close();
      },
    });
    const state = await reader(() => Promise.resolve(new Response(stream))).refresh();
    expect(state).toMatchObject({ lastError: null, feed: GOOD });
  });

  it('judges a declared length the same way: 64 KiB passes, one more is refused unread', async () => {
    const withLength = (n: number) => () =>
      json(JSON.stringify(GOOD), { headers: { 'content-length': String(n) } });
    expect(await reader(withLength(65_536)).refresh()).toMatchObject({ lastError: null });
    expect(await reader(withLength(65_537)).refresh()).toMatchObject({ lastError: 'too large' });
  });

  it('names an answer without a body by its status', async () => {
    const state = await reader(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    ).refresh();
    expect(state.lastError).toBe('http 500');
  });

  it('takes a timeout and a stale age of 1 ms, and says what a lower one is', () => {
    const ok = () =>
      seasonFeedReader({ origin: ORIGIN, fetch: () => json('{}'), timeoutMs: 1, staleAfterMs: 1 });
    expect(ok).not.toThrow();
    const make = (extra: object) => () =>
      seasonFeedReader({ origin: ORIGIN, fetch: () => json('{}'), ...extra });
    expect(make({ timeoutMs: 0 })).toThrow("The season feed's timeout must be whole milliseconds");
    expect(make({ staleAfterMs: 0 })).toThrow("The season feed's staleAfterMs must be whole");
  });
});

describe('the reader and its clock', () => {
  it("measures the age from when it was read, not from the clock's zero", async () => {
    const at = { now: 500 };
    const r = reader(() => json(JSON.stringify(GOOD)), { now: () => at.now, staleAfterMs: 1000 });
    expect((await r.refresh()).receivedAt).toBe(500);
    at.now = 1500;
    expect(r.state().stale).toBe(false);
    at.now = 1501;
    expect(r.state().stale).toBe(true);
  });

  it('is stale exactly when the answer is older than the stale age, and for a clock that is not finite', async () => {
    const at = { now: 0 };
    const r = reader(() => json(JSON.stringify(GOOD)), { now: () => at.now, staleAfterMs: 1000 });
    expect(r.state().stale).toBe(true);
    await r.refresh();
    at.now = 1000;
    expect(r.state().stale).toBe(false);
    at.now = 1001;
    expect(r.state().stale).toBe(true);
    at.now = Number.NaN;
    expect(r.state().stale).toBe(true);
  });

  it('aborts a request that is late, and leaves no timer when it is not', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const late = reader(
      (_url, init) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>(() => undefined);
      },
      { timeoutMs: 1000 },
    );
    const pending = late.refresh();
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).lastError).toBe('timeout');
    expect(signal?.aborted).toBe(true);
    const quick = reader(() => json(JSON.stringify(GOOD)), { timeoutMs: 1000 });
    await quick.refresh();
    expect(vi.getTimerCount()).toBe(0);
  });
});
