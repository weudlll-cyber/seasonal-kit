/**
 * @file   src/server/openRounds.test.ts
 * @brief  The open-rounds page every game publishes: the website's version 1 rules, here.
 *
 * Responsibility: a good round passes as it is, a `Date` written in UTC; titles and kinds are
 *                 cut to 80 and 40 (never through an emoji), ids never; each rule the website
 *                 checks leaves a broken round out and says why (id, title, time, count,
 *                 joinUrl, closed), with only its id; at most 20, counted after the check; no
 *                 unknown field passes. The three games' own rounds (Bingo, Mini Games, Cases)
 *                 come out as the website accepts them.
 * Depends on:     vitest
 * Spec:           Seasonal Entertainment docs/OPEN-ROUNDS.md version 1 and
 *                 server/src/games/openRoundsContract.js at d4230af
 */
import { describe, expect, it, vi } from 'vitest';

import { OPEN_ROUNDS_CACHE_CONTROL, openRoundsPage, type OpenRoundInput } from './openRounds.js';

const ORIGIN = 'https://seasonal.example';
const NOW = Date.parse('2026-11-23T12:00:00Z');

const round = (over: Partial<OpenRoundInput> = {}): OpenRoundInput => ({
  id: 'r1',
  title: 'Friday Royale',
  kind: 'Seasonal Bingo Royale',
  startsAt: '2026-11-23T20:00:00Z',
  signupClosesAt: null,
  players: 3,
  maxPlayers: 40,
  joinUrl: `${ORIGIN}/games/bingo/#/match/ABC`,
  ...over,
});

const page = (rounds: OpenRoundInput[], onDrop?: (id: string, why: string) => void) =>
  openRoundsPage(rounds, { origin: ORIGIN, now: NOW, ...(onDrop ? { onDrop } : {}) });

describe('the open-rounds page (version 1)', () => {
  it('passes a good round as it is, with the version and the cache header', () => {
    expect(page([round()])).toEqual({ version: 1, rounds: [round()] });
    expect(OPEN_ROUNDS_CACHE_CONTROL).toBe('public, max-age=30');
  });

  it('writes a Date in UTC and a UTC string the same way; null stays null', () => {
    const at = new Date('2026-11-23T20:00:00Z');
    const [r] = page([round({ startsAt: at, signupClosesAt: '2026-11-23T19:00:00.000Z' })]).rounds;
    expect(r?.startsAt).toBe('2026-11-23T20:00:00.000Z');
    expect(r?.signupClosesAt).toBe('2026-11-23T19:00:00.000Z');
    expect(page([round({ startsAt: null })]).rounds[0]?.startsAt).toBeNull();
  });

  it('cuts title and kind to 80 and 40, never through an emoji; never cuts an id', () => {
    const [r] = page([round({ title: 'x'.repeat(79) + '🎉', kind: 'k'.repeat(50) })]).rounds;
    expect(r?.title).toBe('x'.repeat(79));
    expect(r?.kind).toBe('k'.repeat(40));
    expect(page([round({ title: 't'.repeat(90) })]).rounds[0]?.title).toHaveLength(80);
    expect(page([round({ id: 'i'.repeat(65) })]).rounds).toEqual([]);
    expect(page([round({ kind: '' })]).rounds[0]?.kind).toBe('');
  });
});

describe('the open-rounds page leaves out what the website would drop', () => {
  it('leaves out each round the website would drop, and says why with its id only', () => {
    const onDrop = vi.fn();
    const broken: [Partial<OpenRoundInput>, string][] = [
      [{ id: ' ' }, 'id'],
      [{ title: '  ' }, 'title'],
      [{ startsAt: '2026-11-23T20:00:00+01:00' }, 'time'],
      [{ signupClosesAt: 'tomorrow' }, 'time'],
      [{ startsAt: new Date(Number.NaN) }, 'time'],
      [{ players: -1 }, 'count'],
      [{ players: 1.5 }, 'count'],
      [{ maxPlayers: 0 }, 'count'],
      [{ joinUrl: 'http://seasonal.example/games/bingo/' }, 'joinUrl'],
      [{ joinUrl: 'https://elsewhere.example/' }, 'joinUrl'],
      [{ joinUrl: '/games/bingo/' }, 'joinUrl'],
      [{ signupClosesAt: '2026-11-23T12:00:00Z' }, 'closed'],
    ];
    expect(
      page(
        broken.map(([over]) => round(over)),
        onDrop,
      ).rounds,
    ).toEqual([]);
    expect(onDrop.mock.calls.map((c: unknown[]) => c[1])).toEqual(broken.map(([, why]) => why));
  });

  it('keeps at most 20, counted after the check, and passes no unknown field', () => {
    const rounds = [
      round({ id: 'bad', players: -1 }),
      ...Array.from({ length: 25 }, (_, i) => ({ ...round({ id: `r${String(i)}` }), name: 'Ana' })),
    ];
    const out = page(rounds).rounds;
    expect(out).toHaveLength(20);
    expect(out[0]?.id).toBe('r0');
    expect(Object.keys(out[0] ?? {})).not.toContain('name');
  });

  it('takes the origin as the origin of the URL it is given', () => {
    // Without `now` it takes the clock; the round has no close time, so it stays.
    const out = openRoundsPage([round()], { origin: `${ORIGIN}/games/bingo/` });
    expect(out.rounds).toHaveLength(1);
  });
});

describe('the three games’ rounds, as each builds them today', () => {
  it('Bingo: a match UUID, its type as kind, close at the lobby close', () => {
    const r = round({
      id: '7d1f4c3e-9a2b-4c1d-8e5f-0a1b2c3d4e5f',
      startsAt: new Date('2026-11-23T20:00:00Z'),
      signupClosesAt: new Date('2026-11-23T19:55:00Z'),
    });
    expect(page([r]).rounds).toHaveLength(1);
  });

  it('Mini Games: the match code, "Seasonal Mini Games · <game>", no close time', () => {
    const r = round({
      id: 'K7Q2',
      kind: 'Seasonal Mini Games · Bomb Defusal',
      signupClosesAt: null,
      joinUrl: `${ORIGIN}/games/mini-games/#/match/K7Q2`,
    });
    expect(page([r]).rounds[0]?.kind).toBe('Seasonal Mini Games · Bomb Defusal');
  });

  it('Cases: a generated title, no times, the case count as maxPlayers', () => {
    const r = round({
      id: 'show-1',
      title: 'Seasonal Cases: 12 cases, 3 prizes',
      kind: 'Seasonal Cases',
      startsAt: null,
      maxPlayers: 12,
      joinUrl: `${ORIGIN}/games/cases/`,
    });
    expect(page([r]).rounds[0]?.maxPlayers).toBe(12);
  });
});
