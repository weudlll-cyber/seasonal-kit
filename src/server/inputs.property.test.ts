/**
 * @file   src/server/inputs.property.test.ts
 * @brief  Property tests (fast-check) for the other outside input the server reads: the return
 *         path, the website's season feed, and the rounds a game lists for the website.
 *
 * Responsibility: random and hostile input never throws unexpectedly and never gets through:
 *                 - `safeNext` gives the base path itself or a path under it that has no second
 *                   slash, no backslash, no control character, no dot segment and no encoded
 *                   slash, backslash or NUL in its path, so it is never an address elsewhere;
 *                 - `parseSeasonFeed` gives null or a feed with exactly the contract's fields,
 *                   at most 64 halving days, every season and token one of the four, whatever
 *                   else the data carries;
 *                 - `openRoundsPage` lists at most 20 rounds with exactly the contract's eight
 *                   fields, every join address an https address of the site's own origin, every
 *                   time an ISO string or null, and calls `onDrop` for each round it refuses.
 * Depends on:     vitest, fast-check
 * Source:         new in the kit (night audit 2026-11-25, piece 4a).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { openRoundsPage, type OpenRoundInput } from './openRounds.js';
import { safeNext } from './returnPath.js';
import { parseSeasonFeed } from './seasonFeed.js';

// A fixed seed, so CI runs the same cases every time; FC_SEED tries others.
const RUNS = { numRuns: 400, seed: Number(process.env['FC_SEED'] ?? 20261125) };
const BASE = '/games/bingo/';

describe('safeNext', () => {
  const hostile = fc.oneof(
    fc.string(),
    fc.string({ unit: 'binary-ascii' }),
    fc
      .tuple(
        fc.constantFrom('', BASE),
        fc.string({ unit: fc.constantFrom(...Array.from('./\\%2fF5cC0?#a\n\t:@ ')) }),
      )
      .map(([head, tail]) => head + tail),
    fc.anything().filter((v) => typeof v !== 'string'),
  );

  it('gives the base path or a plain path under it, never an address elsewhere', () => {
    fc.assert(
      fc.property(hostile, (next) => {
        const out = safeNext(next, BASE);
        expect(out.startsWith(BASE)).toBe(true);
        if (out === BASE) return;
        const path = out.replace(/[?#][\s\S]*$/, '');
        expect(/[^\x21-\x7e]/.test(out)).toBe(false);
        expect(/\/\/|\\/.test(out)).toBe(false);
        expect(/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(path)).toBe(false);
        expect(/%(?:2f|5c|00)/i.test(path)).toBe(false);
      }),
      RUNS,
    );
  });

  it('keeps a plain path as it was written', () => {
    const plain = fc.string({
      unit: fc.constantFrom(...Array.from('abc-_09')),
      minLength: 1,
      maxLength: 12,
    });
    fc.assert(
      fc.property(plain, (leaf) => safeNext(`${BASE}${leaf}?x=1`, BASE) === `${BASE}${leaf}?x=1`),
      RUNS,
    );
  });
});

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const day = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2035-01-01'),
  noInvalidDate: true,
});
const token = fc.constantFrom(...SEASONS).map((s) => s.toUpperCase());
// Mostly right, so the accepting branch is reached; a few fields spoiled, so the refusing ones are.
const mostly = <T>(good: fc.Arbitrary<T>, bad: fc.Arbitrary<unknown>): fc.Arbitrary<unknown> =>
  fc.oneof({ weight: 6, arbitrary: good }, { weight: 1, arbitrary: bad });
const iso = (d: Date): string => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
// Halving days oldest first, as the website lists them; sorted, so a good list stays good.
const days = fc
  .array(day, { maxLength: 5 })
  .map((list) => list.map((d) => d.toISOString().slice(0, 10)).sort());
const feed = fc
  .record({
    v: mostly(fc.constant(1), fc.integer()),
    inSeason: fc.record({
      season: mostly(fc.constantFrom(...SEASONS), fc.string()),
      token: mostly(token, fc.string()),
      since: mostly(day.map(iso), fc.string()),
      extra: fc.anything(),
    }),
    halvingDays: days.chain((list) =>
      fc.tuple(
        ...list.map((d) =>
          fc.record({
            day: mostly(fc.constant(d), fc.string()),
            token: mostly(token, fc.string()),
            extra: fc.anything(),
          }),
        ),
      ),
    ),
    extra: fc.anything(),
  })
  .map((f) => f as unknown);

// 400 generated feeds under coverage take longer than Vitest's 5 s on a loaded machine (it timed
// out once with other suites running beside it), so this one has a limit of its own.
describe('parseSeasonFeed', { timeout: 30_000 }, () => {
  it('never throws, and passes no field the contract does not name', () => {
    let accepted = 0;
    fc.assert(
      fc.property(
        fc.oneof({ weight: 6, arbitrary: feed }, { weight: 1, arbitrary: fc.anything() }),
        (data) => {
          const out = parseSeasonFeed(data);
          if (out === null) return;
          accepted += 1;
          expect(Object.keys(out).sort()).toEqual(['halvingDays', 'inSeason', 'v']);
          expect(Object.keys(out.inSeason).sort()).toEqual(['season', 'since', 'token']);
          expect(SEASONS).toContain(out.inSeason.season);
          expect(out.halvingDays.length).toBeLessThanOrEqual(64);
          for (const h of out.halvingDays) {
            expect(Object.keys(h).sort()).toEqual(['day', 'token']);
            expect(SEASONS).toContain(h.token.toLowerCase());
          }
        },
      ),
      RUNS,
    );
    expect(accepted).toBeGreaterThan(5);
  });
});

const ORIGIN = 'https://site.example';
const time = fc.oneof(fc.constant(null), fc.date({ noInvalidDate: false }), fc.string());
const round = fc
  .record({
    id: fc.string(),
    title: fc.string(),
    kind: fc.string(),
    startsAt: time,
    signupClosesAt: time,
    players: fc.oneof(fc.nat(), fc.double({ noNaN: false }), fc.integer()),
    maxPlayers: fc.oneof(fc.constant(null), fc.nat(), fc.double()),
    joinUrl: fc.oneof(
      fc.string(),
      fc.constantFrom(
        `${ORIGIN}/games/x/`,
        'http://site.example/x',
        'https://evil.example/x',
        '//site.example/x',
        'javascript:1',
      ),
    ),
  })
  .map((r) => r as unknown as OpenRoundInput);

const ROUND_KEYS = [
  'id',
  'joinUrl',
  'kind',
  'maxPlayers',
  'players',
  'signupClosesAt',
  'startsAt',
  'title',
];

describe('openRoundsPage', () => {
  it('lists at most 20 checked rounds, and reports every round it refuses', () => {
    let kept = 0;
    let refused = 0;
    fc.assert(
      fc.property(fc.array(round, { maxLength: 40 }), (rounds) => {
        const dropped: string[] = [];
        const page = openRoundsPage(rounds, {
          origin: ORIGIN,
          now: 1_700_000_000_000,
          onDrop: (id) => dropped.push(id),
        });
        kept += page.rounds.length;
        refused += dropped.length;
        expect(page.rounds.length).toBeLessThanOrEqual(20);
        for (const r of page.rounds) {
          expect(Object.keys(r).sort()).toEqual(ROUND_KEYS);
          expect(new URL(r.joinUrl).origin).toBe(ORIGIN);
          expect(new URL(r.joinUrl).protocol).toBe('https:');
          for (const t of [r.startsAt, r.signupClosesAt]) {
            expect(t === null || !Number.isNaN(Date.parse(t))).toBe(true);
          }
        }
        expect(page.rounds.length + dropped.length).toBeLessThanOrEqual(rounds.length);
      }),
      RUNS,
    );
    // Both the keeping and the refusing branches were reached.
    expect(kept).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(0);
  });

  it('never lists a join address of another origin or scheme', () => {
    for (const joinUrl of [
      'http://site.example/x',
      'https://evil.example/x',
      '//site.example/x',
      'javascript:1',
    ]) {
      const base = {
        id: 'a',
        title: 't',
        kind: '',
        startsAt: null,
        signupClosesAt: null,
        players: 1,
        maxPlayers: null,
        joinUrl,
      };
      expect(openRoundsPage([base], { origin: ORIGIN }).rounds).toEqual([]);
    }
  });
});
