/**
 * @file   src/server/guardedAddress.test.ts
 * @brief  Which addresses count as public: named cases and property tests (fast-check) (K62).
 *
 * Responsibility: named public and non-public addresses of both families; the IPv4-mapped IPv6
 *                 forms (dotted, hex, long) judged as their IPv4; zone ids and non-addresses
 *                 refused; and, over random input, that an IPv4 is public exactly when it is in
 *                 none of the blocked ranges (an oracle written with plain octet arithmetic, not
 *                 the BlockList), that every spelling of a mapped address agrees with its IPv4,
 *                 that every IPv6 in a blocked range is refused, and that no text throws.
 * Depends on:     vitest, fast-check
 * Source:         new in the kit (K62).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isPublicAddress } from './guardedAddress.js';

const RUNS = { numRuns: 500, seed: Number(process.env['FC_SEED'] ?? 20261125) };

const NOT_PUBLIC = [
  '0.0.0.0',
  '10.1.2.3',
  '100.64.0.1',
  '100.127.255.255',
  '127.0.0.1',
  '169.254.169.254',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.1.1',
  '198.18.0.1',
  '224.0.0.1',
  '239.255.255.255',
  '255.255.255.255',
  '::',
  '::1',
  'fc00::1',
  'fd12:3456::1',
  'fe80::1',
  'ff02::1',
  '2001:db8::1',
  '2002:7f00:1::',
  '64:ff9b::7f00:1',
];

describe('named addresses', () => {
  it.each(['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4001::200e'])(
    '%s is public',
    (a) => {
      expect(isPublicAddress(a)).toBe(true);
    },
  );

  it.each(NOT_PUBLIC)('%s is not public', (a) => {
    expect(isPublicAddress(a)).toBe(false);
  });

  it('judges the edges of a range exactly', () => {
    expect(isPublicAddress('172.15.255.255')).toBe(true);
    expect(isPublicAddress('172.32.0.0')).toBe(true);
    expect(isPublicAddress('100.63.255.255')).toBe(true);
    expect(isPublicAddress('100.128.0.0')).toBe(true);
    expect(isPublicAddress('223.255.255.255')).toBe(true);
  });

  it('judges a mapped IPv4 address as its IPv4 address, in every spelling', () => {
    for (const mapped of [
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::FFFF:7F00:0001',
      '0:0:0:0:0:ffff:7f00:1',
      '::ffff:10.0.0.1',
      '::ffff:169.254.169.254',
    ]) {
      expect(isPublicAddress(mapped), mapped).toBe(false);
    }
    expect(isPublicAddress('::ffff:93.184.216.34')).toBe(true);
    expect(isPublicAddress('::ffff:5db8:d822')).toBe(true);
  });

  it('refuses a zone id and text that is no address', () => {
    for (const text of [
      'fe80::1%eth0',
      '2606:4700::1%1',
      '',
      'example.com',
      '1.2.3',
      '1.2.3.4.5',
    ]) {
      expect(isPublicAddress(text), text).toBe(false);
    }
  });
});

// Blocked IPv4 ranges as [first, last] numbers, written out separately from the implementation.
const RANGES: readonly (readonly [number, number])[] = [
  [0, 0x00ffffff],
  [0x0a000000, 0x0affffff],
  [0x64400000, 0x647fffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0000000, 0xc00000ff],
  [0xc0000200, 0xc00002ff],
  [0xc0a80000, 0xc0a8ffff],
  [0xc6120000, 0xc613ffff],
  [0xc6336400, 0xc63364ff],
  [0xcb007100, 0xcb0071ff],
  [0xe0000000, 0xffffffff],
];
const text = (n: number): string =>
  [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(String).join('.');
const ipv4 = fc.integer({ min: 0, max: 0xffffffff });
const hex = (n: number): string =>
  `${((n >>> 16) & 0xffff).toString(16)}:${(n & 0xffff).toString(16)}`;

describe('property tests', () => {
  it('an IPv4 is public exactly when it is in no blocked range', () => {
    fc.assert(
      fc.property(ipv4, (n) => {
        const blocked = RANGES.some(([a, b]) => n >= a && n <= b);
        expect(isPublicAddress(text(n))).toBe(!blocked);
      }),
      RUNS,
    );
  });

  it('every spelling of a mapped address agrees with its IPv4', () => {
    fc.assert(
      fc.property(ipv4, (n) => {
        const verdict = isPublicAddress(text(n));
        expect(isPublicAddress(`::ffff:${text(n)}`)).toBe(verdict);
        expect(isPublicAddress(`::ffff:${hex(n)}`)).toBe(verdict);
        expect(isPublicAddress(`0:0:0:0:0:ffff:${hex(n)}`.toUpperCase())).toBe(verdict);
      }),
      RUNS,
    );
  });

  it('no IPv6 address in a blocked range is public', () => {
    const group = fc.integer({ min: 0, max: 0xffff }).map((n) => n.toString(16));
    const tail = fc.array(group, { minLength: 3, maxLength: 3 }).map((g) => g.join(':'));
    const prefixes = fc.constantFrom(
      (n: number, t: string) => `${(0xfc00 | (n & 0x1ff)).toString(16)}:${t}::1`, // fc00::/7
      (n: number, t: string) => `${(0xfe80 | (n & 0x3f)).toString(16)}:${t}::1`, // fe80::/10
      (n: number, t: string) => `${(0xff00 | (n & 0xff)).toString(16)}:${t}::1`, // ff00::/8
      (_n: number, t: string) => `2001:db8:${t}::1`,
      (_n: number, t: string) => `2002:${t}::1`,
    );
    fc.assert(
      fc.property(prefixes, fc.integer({ min: 0, max: 0xffff }), tail, (make, n, t) => {
        expect(isPublicAddress(make(n, t.split(':').slice(0, 2).join(':')))).toBe(false);
      }),
      RUNS,
    );
  });

  it('never throws, and text that is no address is never public', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (s) => {
        const verdict = isPublicAddress(s);
        if (!/^[0-9a-fA-F:.]+$/.test(s)) expect(verdict).toBe(false);
      }),
      RUNS,
    );
  });
});
