/**
 * @file   src/server/identity.property.test.ts
 * @brief  Property tests (fast-check) for the website's identity headers: `stepsFrom` and
 *         `identityFrom` on random and hostile headers.
 *
 * Responsibility: whatever the headers hold, neither throws, and what they give is only what the
 *                 contract allows:
 *                 - `stepsFrom`: at most three steps, each with exactly `ladder`, `name`, `icon`
 *                   (a step with another key is dropped, never passed on), a known ladder, a
 *                   trimmed name of 1 to 40 characters, an icon that is null or the contract's
 *                   address; in mode `all` any bad entry gives no steps at all;
 *                 - `identityFrom`: null, or a subject without leading zeros, at most one role of
 *                   the contract's three, a name with no control or bidi character, a game name
 *                   of at most 24 characters, and at most three steps.
 * Depends on:     vitest, fast-check
 * Source:         new in the kit (night audit 2026-11-25, piece 4a).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isStepIcon } from '../stepShape.js';
import { IDENTITY_HEADERS, identityFrom, type RequestHeaders } from './identity.js';
import { stepsFrom } from './steps.js';

// A fixed seed, so CI runs the same cases every time; FC_SEED tries others.
const RUNS = { numRuns: 400, seed: Number(process.env['FC_SEED'] ?? 20261125) };
const LADDERS = ['holder', 'farmer', 'investor'];
const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

// A control character, a line or paragraph separator, or a bidi control: none may be in a name
// (identity.ts). Spelled by code point, so no such character sits in this file.
const SEPARATORS = [0x2028, 0x2029, 0x200e, 0x200f, 0x061c];
const isUnsafeInName = (name: string): boolean =>
  Array.from(name).some((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    const bidi = (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069);
    return /\p{Cc}/u.test(ch) || SEPARATORS.includes(c) || bidi;
  });

const hex32 = fc.string({
  unit: fc.constantFrom(...Array.from('0123456789abcdef')),
  minLength: 32,
  maxLength: 32,
});
const icon = fc.oneof(
  fc.constant(null),
  hex32.map((h) => `/media/step-icons/${h}.webp`),
  fc.string(),
  fc.integer(),
);
// Mostly right, so the accepting branch is reached; a few fields spoiled or extra, so the
// refusing ones are too: unknown ladders, wrong types, other keys.
const mostly = <T>(good: fc.Arbitrary<T>, bad: fc.Arbitrary<unknown>): fc.Arbitrary<unknown> =>
  fc.oneof({ weight: 6, arbitrary: good }, { weight: 1, arbitrary: bad });
const step = fc.record(
  {
    ladder: mostly(fc.constantFrom(...LADDERS), fc.oneof(fc.string(), fc.integer())),
    name: mostly(fc.string({ minLength: 1, maxLength: 40 }), fc.oneof(fc.string(), fc.integer())),
    icon: mostly(
      hex32.map((h) => `/media/step-icons/${h}.webp`),
      icon,
    ),
    extra: fc.anything(),
  },
  { requiredKeys: ['ladder', 'name', 'icon'] },
);
const header = fc.oneof(
  { weight: 1, arbitrary: fc.jsonValue().map(encode) },
  { weight: 6, arbitrary: fc.array(step, { maxLength: 4 }).map(encode) },
  { weight: 1, arbitrary: fc.string() },
);

describe('stepsFrom', () => {
  it('never throws, and gives at most three well-formed steps, in either mode', () => {
    let withSteps = 0;
    const mode = fc.constantFrom('each', 'all');
    fc.assert(
      fc.property(fc.option(header, { nil: undefined }), mode, (h, m) => {
        const { steps } = stepsFrom(h, m);
        if (steps.length > 0) withSteps += 1;
        expect(steps.length).toBeLessThanOrEqual(3);
        for (const s of steps) {
          expect(Object.keys(s).sort()).toEqual(['icon', 'ladder', 'name']);
          expect(LADDERS).toContain(s.ladder);
          expect(s.name).toBe(s.name.trim());
          expect(s.name.length).toBeGreaterThanOrEqual(1);
          expect(s.name.length).toBeLessThanOrEqual(40);
          expect(s.icon === null || isStepIcon(s.icon)).toBe(true);
        }
      }),
      RUNS,
    );
    // The generators reach the accepting branch, or the property would prove nothing.
    expect(withSteps).toBeGreaterThan(5);
  });

  it('in mode all, one bad entry or more than three gives no steps and marks the header bad', () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 6 }), (list) => {
        const each = stepsFrom(encode(list), 'each');
        const all = stepsFrom(encode(list), 'all');
        expect(all.bad).toBe(each.bad);
        if (all.bad) expect(all.steps).toEqual([]);
        else expect(all.steps).toEqual(each.steps);
      }),
      RUNS,
    );
  });
});

// Header values as Node gives them: a string, or missing; a repeated one is joined with ", ".
const word = fc.constantFrom('true', 'false', 'member', 'admin', 'organiser', '1', '42', 'Jürgen');
const value = fc.option(fc.oneof(fc.string(), word), { nil: undefined });
const headers = fc
  .record(
    {
      [IDENTITY_HEADERS.id]: fc.oneof(value, fc.nat().map(String)),
      [IDENTITY_HEADERS.name]: value,
      [IDENTITY_HEADERS.roles]: value,
      [IDENTITY_HEADERS.emailVerified]: value,
      [IDENTITY_HEADERS.canHost]: value,
      [IDENTITY_HEADERS.steps]: fc.option(header, { nil: undefined }),
    },
    { requiredKeys: [] },
  )
  .map((h) => h as RequestHeaders);

describe('identityFrom', () => {
  it('never throws, and gives null or an identity inside the contract', () => {
    let accepted = 0;
    fc.assert(
      fc.property(headers, fc.constantFrom('each', 'all'), (h, mode) => {
        const who = identityFrom(h, mode);
        if (who === null) return;
        accepted += 1;
        expect(who.subject).toMatch(/^[1-9]\d{0,15}$/);
        expect(who.roles.length).toBeLessThanOrEqual(1);
        for (const role of who.roles) expect(['member', 'organiser', 'admin']).toContain(role);
        expect(isUnsafeInName(who.websiteName)).toBe(false);
        expect(who.websiteName.length).toBeLessThanOrEqual(128);
        expect(who.displayName.length).toBeGreaterThan(0);
        expect(who.displayName.length).toBeLessThanOrEqual(24);
        expect(who.steps.length).toBeLessThanOrEqual(3);
      }),
      RUNS,
    );
    expect(accepted).toBeGreaterThan(5);
  });

  it('grants nothing from a joined repeat of a header', () => {
    const base = { [IDENTITY_HEADERS.id]: '7', [IDENTITY_HEADERS.name]: 'Ana' };
    for (const roles of ['admin, admin', 'member, admin', 'admin,member']) {
      expect(identityFrom({ ...base, [IDENTITY_HEADERS.roles]: roles }, 'each')).toBeNull();
    }
    const joined = { ...base, [IDENTITY_HEADERS.canHost]: 'true, true' };
    expect(identityFrom(joined, 'each')?.canHost).toBe(false);
  });
});
