/**
 * @file   src/parsers.property.test.ts
 * @brief  Property tests (fast-check) for the browser side's parsers of outside input: the step
 *         icon check and the two frame messages.
 *
 * Responsibility: random and hostile input never throws unexpectedly, never passes a field the
 *                 contract does not name, and never lets a forbidden address through:
 *                 - `isStepIcon` is true for exactly "/media/step-icons/<32 lower-case hex>.webp"
 *                   (checked against an oracle written another way) and for no non-string, an
 *                   object with a `toString` that spells a valid address included;
 *                 - `parseChat` and `parseCall` give null or a message whose keys are exactly
 *                   those the contract names for its type, whatever else the data carries;
 *                 - `chatEmbedUrl` and `callEmbedUrl` give a path on this site or throw.
 * Depends on:     vitest, fast-check
 * Source:         new in the kit (night audit 2026-11-25, piece 4a).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { callEmbedUrl, parseCall } from './callView.js';
import { chatEmbedUrl, parseChat } from './chatEmbed.js';
import { isStepIcon } from './stepShape.js';

// A fixed seed, so CI runs the same cases every time; FC_SEED tries others.
const RUNS = { numRuns: 400, seed: Number(process.env['FC_SEED'] ?? 20261125) };
const HEX = fc.string({
  unit: fc.constantFrom(...Array.from('0123456789abcdef')),
  minLength: 32,
  maxLength: 32,
});

// The contract's address, spelled out another way than the check's regular expression.
function oracle(s: string): boolean {
  const head = '/media/step-icons/';
  const tail = '.webp';
  if (s.length !== head.length + 32 + tail.length) return false;
  if (!s.startsWith(head) || !s.endsWith(tail)) return false;
  return Array.from(s.slice(head.length, head.length + 32)).every((c) =>
    '0123456789abcdef'.includes(c),
  );
}

describe('isStepIcon', () => {
  it('is true for every address of the contract', () => {
    fc.assert(
      fc.property(HEX, (h) => isStepIcon(`/media/step-icons/${h}.webp`)),
      RUNS,
    );
  });

  it('agrees with the oracle on any string, hostile ones included', () => {
    const text = fc.oneof(
      fc.string(),
      fc.string({ unit: 'binary' }),
      fc.string({ unit: 'grapheme' }),
    );
    fc.assert(
      fc.property(text, (s) => isStepIcon(s) === oracle(s)),
      RUNS,
    );
  });

  it('refuses a valid address with anything added or changed', () => {
    const edited = fc
      .tuple(HEX, fc.constantFrom('?x=1', '#a', ' ', '\n', '/', '.webp', '%2f'), fc.boolean())
      .map(([h, extra, before]) =>
        before ? `${extra}/media/step-icons/${h}.webp` : `/media/step-icons/${h}.webp${extra}`,
      );
    fc.assert(
      fc.property(edited, (s) => !isStepIcon(s)),
      RUNS,
    );
  });

  it('is false for anything that is not a string, a lying toString included', () => {
    const liar = { toString: () => '/media/step-icons/0123456789abcdef0123456789abcdef.webp' };
    expect(isStepIcon(liar)).toBe(false);
    const other = fc.anything().filter((v) => typeof v !== 'string');
    fc.assert(
      fc.property(other, (v) => !isStepIcon(v)),
      RUNS,
    );
  });
});

// Data of a message: the contract's fields, in any state, among others.
// Messages of the contract, right in every field, with another key beside them.
const flag = fc.boolean();
const word = fc.constantFrom('scheduled', 'live', 'ended');
const code = fc.stringMatching(/^[a-z][a-z0-9_]{0,20}$/);
const size = fc.double({ min: 0, max: 5000, noNaN: true });
const rightMessage = fc
  .oneof(
    fc.record({ type: fc.constant('ready'), room: fc.option(fc.string()), signedIn: flag }),
    fc.record({ type: fc.constant('unread'), room: fc.option(fc.string()), count: fc.nat() }),
    fc.record({ type: fc.constant('resize'), height: size }),
    fc.record({
      type: fc.constant('ready'),
      call: fc.integer({ min: 1, max: 10_000 }),
      status: word,
      signedIn: flag,
    }),
    fc.record({ type: fc.constant('live'), listening: flag }),
    fc.record({ type: fc.constant('ended'), reason: fc.constantFrom('ended', 'gone', 'unshared') }),
    fc.record({ type: fc.constant('speaking'), active: flag }),
    fc.record({
      type: fc.constant('resize'),
      mode: fc.constantFrom('picture', 'collapsed'),
      width: size,
      height: size,
    }),
    fc.record({ type: fc.constant('error'), code }),
  )
  .map((m) => ({ ...m, extra: 'x' }));

const fields = fc.dictionary(
  fc.constantFrom(
    'type',
    'room',
    'signedIn',
    'count',
    'height',
    'call',
    'status',
    'mode',
    'width',
    'code',
    'extra',
  ),
  fc.oneof(
    fc.anything(),
    fc.constantFrom('ready', 'unread', 'resize', 'live', 'ended', 'speaking', 'error', 'picture'),
  ),
);

const data = fc.oneof({ weight: 4, arbitrary: rightMessage }, { weight: 1, arbitrary: fields });

describe('the frame messages', () => {
  it('parseChat never throws and keeps only the fields of its type', () => {
    let accepted = 0;
    fc.assert(
      fc.property(data, (d) => {
        const message = parseChat(d);
        if (message === null) return true;
        accepted += 1;
        const expected = {
          ready: ['room', 'signedIn', 'type'],
          unread: ['count', 'room', 'type'],
          resize: ['height', 'type'],
        }[message.type];
        return Object.keys(message).sort().join() === expected.join();
      }),
      RUNS,
    );
    expect(accepted).toBeGreaterThan(50);
  });

  it('parseCall never throws and keeps only the fields of its type', () => {
    const allowed: Record<string, readonly string[]> = {
      ready: ['call', 'signedIn', 'status', 'type'],
      live: ['listening', 'type'],
      ended: ['reason', 'type'],
      speaking: ['active', 'type'],
      resize: ['height', 'mode', 'type', 'width'],
      error: ['code', 'type'],
    };
    let accepted = 0;
    fc.assert(
      fc.property(data, (d) => {
        const message = parseCall(d);
        if (message === null) return true;
        accepted += 1;
        return Object.keys(message).sort().join() === allowed[message.type]?.join();
      }),
      RUNS,
    );
    expect(accepted).toBeGreaterThan(50);
  });
});

describe('the embed addresses', () => {
  it('chatEmbedUrl and callEmbedUrl give a path on this site, or throw', () => {
    const path = fc.oneof(
      fc.string(),
      fc.constantFrom('//evil.example', '/\\evil', 'https://x', '/ok'),
    );
    fc.assert(
      fc.property(path, (p) => {
        for (const make of [
          () => chatEmbedUrl('room', 'auto', p),
          () => callEmbedUrl(7, 'auto', p),
        ]) {
          try {
            const url = make();
            if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return false;
          } catch (error) {
            if (!(error instanceof TypeError)) return false;
          }
        }
        return true;
      }),
      RUNS,
    );
  });
});
