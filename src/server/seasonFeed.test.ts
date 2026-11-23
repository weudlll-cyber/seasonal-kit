/**
 * @file   src/server/seasonFeed.test.ts
 * @brief  The season feed reader against the website's real shape (version 1).
 *
 * Responsibility: the website's own fixture of 2026-11-22 parses as it is; a field added within
 *                 version 1 is dropped, another `v`, a broken `inSeason` or halving day is no
 *                 answer; the reader asks `<origin>/api/public/season` over https only, without
 *                 following redirects, for JSON; a failure (HTTP status, not JSON, invalid, too
 *                 large, a thrown fetch) keeps the last good answer and says why; staleness
 *                 counts from the last good answer.
 * Depends on:     vitest
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §6; server/src/season/routes.js
 *                 and server/test/seasonFeed.test.js at d4230af
 */
import { describe, expect, it, vi } from 'vitest';

import { parseSeasonFeed, seasonFeedReader } from './seasonFeed.js';

// The website's fixture for 2026-11-22 (server/test/seasonFeed.test.js).
const FEED = {
  v: 1,
  inSeason: { season: 'autumn', token: 'AUTUMN', since: '2026-03-05T22:32:17Z' },
  halvingDays: [
    { day: '2026-12-04', token: 'AUTUMN' },
    { day: '2027-09-04', token: 'WINTER' },
    { day: '2028-06-04', token: 'SPRING' },
  ],
};

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, ...init });

describe('parseSeasonFeed', () => {
  it('reads the website’s answer as it is, and drops fields it does not know', () => {
    expect(parseSeasonFeed(FEED)).toEqual(FEED);
    const ms = { ...FEED, inSeason: { ...FEED.inSeason, since: '2026-03-05T22:32:17.000Z' } };
    expect(parseSeasonFeed(ms)?.inSeason.since).toBe('2026-03-05T22:32:17.000Z');
    const more = { ...FEED, next: 'x', inSeason: { ...FEED.inSeason, colour: '#fff' } };
    expect(parseSeasonFeed(more)).toEqual(FEED);
  });

  it('is no answer for another version or a broken part', () => {
    const broken: unknown[] = [
      null,
      [],
      { ...FEED, v: 2 },
      { ...FEED, inSeason: null },
      { ...FEED, inSeason: { ...FEED.inSeason, season: 'monsoon' } },
      { ...FEED, inSeason: { ...FEED.inSeason, token: 'WINTER' } },
      { ...FEED, inSeason: { ...FEED.inSeason, since: '2026-03-05' } },
      { ...FEED, inSeason: { ...FEED.inSeason, since: '2026-13-45T99:99:99Z' } },
      { ...FEED, halvingDays: {} },
      { ...FEED, halvingDays: [{ day: '4 Dec', token: 'AUTUMN' }] },
      { ...FEED, halvingDays: [{ day: '2026-12-04', token: 'autumn' }] },
      { ...FEED, halvingDays: ['2026-12-04'] },
      // Dates that Date.parse rolls over, and days that are no date (v0.11.0 pass, finding 6).
      { ...FEED, inSeason: { ...FEED.inSeason, since: '2026-02-30T00:00:00Z' } },
      { ...FEED, inSeason: { ...FEED.inSeason, since: '2026-02-28T24:00:00Z' } },
      { ...FEED, halvingDays: [{ day: '2026-99-99', token: 'AUTUMN' }] },
      { ...FEED, halvingDays: [{ day: '2026-02-30', token: 'AUTUMN' }] },
      // Out of order, and more halvings than two and a half years hold (finding 7).
      { ...FEED, halvingDays: [FEED.halvingDays[1], FEED.halvingDays[0]] },
      { ...FEED, halvingDays: Array.from({ length: 65 }, () => FEED.halvingDays[0]) },
    ];
    for (const value of broken) expect(parseSeasonFeed(value)).toBeNull();
  });
});

describe('the season feed reader', () => {
  it('asks the website’s feed over https, for JSON, without following a redirect', async () => {
    const fetch = vi.fn(() => Promise.resolve(json(FEED)));
    const reader = seasonFeedReader({ origin: 'https://site.example/games', fetch, now: () => 5 });
    expect(reader.state()).toEqual({ feed: null, receivedAt: null, stale: true, lastError: null });
    expect(await reader.refresh()).toEqual({
      feed: FEED,
      receivedAt: 5,
      stale: false,
      lastError: null,
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://site.example/api/public/season');
    expect(init.redirect).toBe('error');
    expect(init.headers).toEqual({ accept: 'application/json' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(() => seasonFeedReader({ origin: 'http://site.example', fetch })).toThrow(/https/);
  });
});

describe('the season feed reader when a read fails', () => {
  it('keeps the last good answer when a read fails, says why, and reports it stale', async () => {
    let clock = 0;
    const answers: (() => Promise<Response>)[] = [
      () => Promise.resolve(json(FEED)),
      () => Promise.resolve(new Response('busy', { status: 503 })),
      () => Promise.resolve(new Response('<html>')),
      () => Promise.resolve(json({ ...FEED, v: 2 })),
      () => Promise.resolve(new Response('x'.repeat(70_000))),
      () => Promise.resolve(json(FEED, { headers: { 'content-length': '100000' } })),
      () => Promise.reject(new Error('refused: private address')),
      () => Promise.reject(new Error('aborted')),
    ];
    const fetch = vi.fn(() => answers.shift()?.() ?? Promise.reject(new Error('no more')));
    const reader = seasonFeedReader({
      origin: 'https://site.example',
      fetch,
      staleAfterMs: 1_000,
      now: () => clock,
    });
    await reader.refresh();
    const reasons: (string | null)[] = [];
    for (let i = 0; i < 7; i++) {
      clock += 200;
      const s = await reader.refresh();
      expect(s.feed).toEqual(FEED);
      expect(s.receivedAt).toBe(0);
      reasons.push(s.lastError);
    }
    expect(reasons).toEqual([
      'http 503',
      'not json',
      'invalid',
      'too large',
      'too large',
      'refused: private address',
      'aborted',
    ]);
    expect(reader.state().stale).toBe(true);
  });

  it('names a failure that is no Error "failed"', async () => {
    const reader = seasonFeedReader({
      origin: 'https://site.example',
      // A rejection with a string, as a careless fetch wrapper may give.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      fetch: () => Promise.reject('x'),
    });
    expect((await reader.refresh()).lastError).toBe('failed');
  });
});
