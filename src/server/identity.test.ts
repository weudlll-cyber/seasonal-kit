/**
 * @file   src/server/identity.test.ts
 * @brief  The website sign-in's checks: trusted peers, the proxy secret, guest or member, the
 *         identity, the steps and the roles.
 *
 * Responsibility: a peer counts only inside the trusted list (IPv4-mapped too, keywords trust
 *                 nobody), never by a forwarding header. The secret matches only exactly, never
 *                 when empty, missing or repeated. The decision checks peer and secret first,
 *                 then a guest, then a valid id and name. The identity needs a numeric id and a
 *                 name, fits the name, reads the flags, and counts a repeated header as missing.
 *                 The steps keep valid ones (`each`) or none (`all`) and refuse foreign icons,
 *                 extra keys, bad JSON and oversized headers. The roles map admin → game_admin
 *                 and can-host → organizer only. Mini Games' websiteIdentity.test.ts (866df03),
 *                 plus Bingo's strict steps and the decision.
 * Depends on:     vitest
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2, §3; docs/AUTH.md
 */
import { describe, expect, it } from 'vitest';

import {
  IDENTITY_HEADERS,
  identityFrom,
  isWebsiteGuest,
  mappedRoles,
  websiteSignInCheck,
} from './identity.js';
import { stepsFrom } from './steps.js';
import { secretMatches, trustedPeers } from './trust.js';

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const step = (
  name: string,
  icon: string | null = '/media/step-icons/0123456789abcdef0123456789abcdef.webp',
) => ({
  ladder: 'holder',
  name,
  icon,
});
const member = { 'x-acting-user-id': '42', 'x-acting-user': 'Walter W.' };
// A name as Node's req.headers gives it when the proxy sent UTF-8 bytes: one latin1 character
// per byte (D6).
const wire = (name: string): string => Buffer.from(name, 'utf8').toString('latin1');

describe('non-ASCII names (D6)', () => {
  it('decodes a UTF-8 name: umlauts and an emoji', () => {
    expect(
      identityFrom({ ...member, 'x-acting-user': wire('Jürgen Größe') }, 'each'),
    ).toMatchObject({
      websiteName: 'Jürgen Größe',
      displayName: 'Jürgen_Größe',
    });
    const emoji = identityFrom({ ...member, 'x-acting-user': wire('Ana 🎉') }, 'each');
    expect(emoji?.websiteName).toBe('Ana 🎉');
    // The emoji is no letter: the game's name keeps the letters only.
    expect(emoji?.displayName).toBe('Ana_');
  });

  it('leaves an ASCII name exactly as it is, as the website sends every name today', () => {
    expect(identityFrom(member, 'each')?.websiteName).toBe('Walter W.');
  });

  it('rejects malformed bytes and characters no header can carry', () => {
    // A lone latin1 "ü" (0xFC) is no UTF-8; a truncated sequence neither.
    expect(identityFrom({ ...member, 'x-acting-user': 'Jürgen' }, 'each')).toBeNull();
    expect(
      identityFrom({ ...member, 'x-acting-user': wire('Jü').slice(0, -1) }, 'each'),
    ).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user': 'Ana 🎉' }, 'each')).toBeNull();
  });

  it.each([
    ['a right-to-left override', 'Ana\u202eniamdA'],
    ['a left-to-right mark', 'Ana\u200e'],
    ['an isolate', 'Ana\u2066x\u2069'],
    ['a line separator', 'Ana\u2028admin'],
    ['a next-line control', 'Ana\u0085admin'],
    ['a tab', 'Ana\tadmin'],
  ])('rejects a name with %s (audit B1)', (_what, name) => {
    expect(identityFrom({ ...member, 'x-acting-user': wire(name) }, 'each')).toBeNull();
  });

  it('keeps an emoji joined by a zero-width joiner', () => {
    const family = '\u{1f469}\u200d\u{1f467}';
    expect(
      identityFrom({ ...member, 'x-acting-user': wire(`Ana ${family}`) }, 'each')?.websiteName,
    ).toBe(`Ana ${family}`);
  });
});

describe('trusted peers', () => {
  it('trusts the listed addresses and ranges only', () => {
    const trusted = trustedPeers(['127.0.0.1', '172.18.0.0/16', 'fd00::/8', 'uniquelocal']);
    expect(trusted('127.0.0.1')).toBe(true);
    expect(trusted('::ffff:172.18.4.2')).toBe(true);
    expect(trusted('fd00::1')).toBe(true);
    expect(trusted('10.0.0.9')).toBe(false);
    expect(trusted('not-an-address')).toBe(false);
    expect(trusted(undefined)).toBe(false);
  });

  // V0.8.0 pass, review 1, finding 1: "127.0.0.1/" read as /0 and trusted every IPv4 peer.
  it.each([
    '127.0.0.1/',
    '172.18.0.0/ ',
    '10.0.0.0/33',
    '::1/129',
    '10.0.0.0/0x10',
    '10.0.0.0/8/1',
  ])('refuses the range %j when the list is made', (entry) => {
    expect(() => trustedPeers([entry])).toThrow(RangeError);
  });
});

describe('the proxy secret', () => {
  it('matches only the exact secret', () => {
    const matches = secretMatches('s3cret-value');
    expect(matches('s3cret-value')).toBe(true);
    expect(matches('s3cret-valuE')).toBe(false);
    expect(matches('s3cret-value ')).toBe(false);
    expect(matches('s3cret')).toBe(false);
  });

  it('never matches when missing, empty, repeated, or when no secret is set up', () => {
    const matches = secretMatches('s3cret-value');
    expect(matches(undefined)).toBe(false);
    expect(matches('')).toBe(false);
    expect(matches(['s3cret-value', 's3cret-value'])).toBe(false);
    const unset = secretMatches('');
    expect(unset('')).toBe(false);
    expect(unset('anything')).toBe(false);
  });
});

const decide = websiteSignInCheck({
  trustedProxies: ['127.0.0.1'],
  proxySecret: 'proxy-secret',
  secretHeader: 'x-smg-proxy-secret',
  steps: 'each',
});
const fromProxy = { 'x-smg-proxy-secret': 'proxy-secret' };

describe('the sign-in decision', () => {
  it('refuses an untrusted peer or a wrong secret, whatever the headers say', () => {
    expect(decide('10.0.0.9', { ...fromProxy, ...member })).toEqual({ kind: 'untrusted' });
    expect(decide('127.0.0.1', { 'x-smg-proxy-secret': 'nope', ...member })).toEqual({
      kind: 'untrusted',
    });
    // A forwarding header names no peer.
    expect(decide(undefined, { ...fromProxy, ...member, 'x-forwarded-for': '127.0.0.1' })).toEqual({
      kind: 'untrusted',
    });
  });

  it('takes a guest as a guest even with user headers, and needs a valid member', () => {
    expect(decide('127.0.0.1', { ...fromProxy, 'x-acting-guest': 'true', ...member })).toEqual({
      kind: 'guest',
    });
    expect(decide('127.0.0.1', fromProxy)).toEqual({ kind: 'invalid' });
    const signedIn = decide('127.0.0.1', { ...fromProxy, ...member });
    expect(signedIn.kind === 'member' && signedIn.identity.subject).toBe('42');
  });
});

describe('the sign-in decision against repeated headers and mixed-case names', () => {
  // V0.8.0 pass, review 1, finding 2: Node joins a repeated header with ", "; it must never help a
  // visitor.
  it('never lets a joined repeat make a guest a member or add a role', () => {
    const guestTwice = { ...fromProxy, ...member, 'x-acting-guest': 'true, true' };
    expect(decide('127.0.0.1', guestTwice)).toEqual({ kind: 'guest' });
    const injectedRole = { ...fromProxy, ...member, 'x-acting-user-roles': 'member, admin' };
    expect(decide('127.0.0.1', injectedRole)).toEqual({ kind: 'invalid' });
    const hostTwice = { ...fromProxy, ...member, 'x-acting-user-can-host': 'false, true' };
    const who = decide('127.0.0.1', hostTwice);
    expect(who.kind === 'member' && who.identity.canHost).toBe(false);
  });

  // V0.8.0 pass, review 1, finding 9: names as configured in mixed case still match Node's
  // lower-case keys.
  it('compares header names in lower case', () => {
    const mixed = websiteSignInCheck({
      trustedProxies: ['127.0.0.1'],
      proxySecret: 'proxy-secret',
      secretHeader: 'X-Smg-Proxy-Secret',
      steps: 'each',
      names: { ...IDENTITY_HEADERS, id: 'X-Acting-User-Id', guest: 'X-Acting-Guest' },
    });
    const who = mixed('127.0.0.1', { ...fromProxy, ...member });
    expect(who.kind).toBe('member');
    expect(mixed('127.0.0.1', { ...fromProxy, 'x-acting-guest': 'true' })).toEqual({
      kind: 'guest',
    });
  });
});

describe('the identity headers', () => {
  it('needs a positive safe integer id without leading zeros and a name, each sent once', () => {
    expect(identityFrom({ ...member, 'x-acting-user-id': 'u-1' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': '042' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': '0' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': '9007199254740993' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': '42, 43' }, 'each')).toBeNull();
    expect(
      identityFrom({ ...member, 'x-acting-user-id': '9007199254740991' }, 'each')?.subject,
    ).toBe('9007199254740991');
    expect(identityFrom({ 'x-acting-user-id': '42' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': ['42', '43'] }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user': ['a', 'b'] }, 'each')).toBeNull();
  });

  it('makes the name fit, keeps the website name, reads the flags', () => {
    const who = identityFrom(
      {
        ...member,
        'x-acting-user-roles': 'Admin',
        'x-acting-user-email-verified': 'true',
        'x-acting-user-can-host': 'TRUE',
        'x-acting-user-steps': encode([]),
      },
      'each',
    );
    expect(who).toMatchObject({
      subject: '42',
      websiteName: 'Walter W.',
      displayName: 'Walter_W.',
      roles: ['admin'],
      emailVerified: true,
      canHost: true,
      steps: [],
      badSteps: false,
    });
    expect(identityFrom({ ...member, 'x-acting-user': '!!' }, 'each')?.displayName).toMatch(
      /^player-[0-9a-f]{6}$/,
    );
    // "𝒜" is a letter of two UTF-16 units: the cut at 24 would split it, so it goes.
    const long = identityFrom({ ...member, 'x-acting-user': wire(`${'a'.repeat(23)}𝒜b`) }, 'each');
    expect(long?.displayName).toBe('a'.repeat(23));
    expect(
      identityFrom({ ...member, 'x-acting-user': 'x'.repeat(200) }, 'each')?.websiteName,
    ).toHaveLength(128);
    // V0.8.0 pass, review 2, finding 7: the cut at 128 leaves no lone surrogate.
    const kept = identityFrom({ ...member, 'x-acting-user': wire(`${'x'.repeat(127)}𝒜`) }, 'each');
    expect(kept?.websiteName).toBe('x'.repeat(127));
  });
});

describe('the role and guest headers', () => {
  it('reads the role as exactly one of member, organiser, admin, or none', () => {
    const roleOf = (roles: string | readonly string[] | undefined) =>
      identityFrom({ ...member, 'x-acting-user-roles': roles }, 'each')?.roles ?? null;
    expect(roleOf('member')).toEqual(['member']);
    expect(roleOf(' Organiser ')).toEqual(['organiser']);
    expect(roleOf(undefined)).toEqual([]);
    expect(roleOf('')).toEqual([]);
    expect(roleOf('super_admin')).toBeNull();
    expect(roleOf('member,admin')).toBeNull();
    expect(roleOf(['member', 'admin'])).toBeNull();
  });

  it('tells a guest from a member, failing closed on anything but "false"', () => {
    expect(isWebsiteGuest({ 'x-acting-guest': 'true' })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': 'yes' })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': ['true', 'true'] })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': 'false' })).toBe(false);
    // V0.8.0 pass, review 3, finding 5: present but blank is a guest too (fail closed).
    expect(isWebsiteGuest({ 'x-acting-guest': ' ' })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': '' })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': ' FALSE ' })).toBe(false);
    expect(isWebsiteGuest(member)).toBe(false);
  });
});

describe('the steps header', () => {
  it('keeps at most three valid steps in `each`, none past three in `all`', () => {
    const four = [step('One'), step('Two', null), step('Three'), step('Four')];
    expect(stepsFrom(encode(four), 'each')).toEqual({ steps: four.slice(0, 3), bad: true });
    expect(stepsFrom(encode(four), 'all')).toEqual({ steps: [], bad: true });
    expect(stepsFrom(encode(four.slice(0, 2)), 'all')).toEqual({
      steps: four.slice(0, 2),
      bad: false,
    });
  });

  it.each(['holder', 'farmer', 'investor'])(
    'takes the contract’s ladder %s (audit B2)',
    (ladder) => {
      const one = { ...step('One'), ladder };
      expect(stepsFrom(encode([one]), 'each')).toEqual({ steps: [one], bad: false });
    },
  );

  it('refuses a foreign icon, an unknown ladder, extra keys and bad names', () => {
    const steps = [
      step('Away', 'https://evil.example/x.webp'),
      step('Relative', '//evil.example/x.webp'),
      step('Back', '/media\\x.webp'),
      step('Query', '/media/x.webp?track=1'),
      // V0.8.0 pass, review 2, finding 3: only the contract's icon files, no other route of the
      // site.
      step('Route', '/media/../api/admin'),
      step('Other', '/media/step-icons/x.webp'),
      step('Upper', '/media/step-icons/0123456789ABCDEF0123456789ABCDEF.webp'),
      step('Png', '/media/step-icons/0123456789abcdef0123456789abcdef.png'),
      { ladder: 'miner', name: 'X', icon: null },
      { ...step('Extra'), href: 'javascript:alert(1)' },
      step('   '),
      step('n'.repeat(41)),
      { ladder: 'holder', name: 5, icon: null },
      { ladder: 'holder', name: 'Bad icon', icon: 7 },
      'not a step',
      step('  Kept  '),
    ];
    expect(stepsFrom(encode(steps), 'each')).toEqual({
      steps: [
        {
          ladder: 'holder',
          name: 'Kept',
          icon: '/media/step-icons/0123456789abcdef0123456789abcdef.webp',
        },
      ],
      bad: true,
    });
    expect(stepsFrom(encode(steps), 'all').steps).toEqual([]);
  });
});

describe('the steps header when it is broken', () => {
  it('gives no steps for bad base64url, bad JSON or UTF-8, a non-array or an oversized header', () => {
    expect(stepsFrom('%%%', 'each')).toEqual({ steps: [], bad: true });
    expect(stepsFrom(Buffer.from('{not json').toString('base64url'), 'each').steps).toEqual([]);
    expect(stepsFrom(Buffer.from([0xff, 0xfe]).toString('base64url'), 'each').steps).toEqual([]);
    expect(stepsFrom(encode({ ladder: 'holder' }), 'each').steps).toEqual([]);
    expect(stepsFrom('a'.repeat(5_000), 'each').steps).toEqual([]);
    // Audit B2: a well-formed header over 2,048 characters is refused for its size alone.
    // JSON's own whitespace pads a valid array: one valid step, just too long a header.
    const padded = (spaces: number): string =>
      Buffer.from(`[${' '.repeat(spaces)}${JSON.stringify(step('A'))}]`).toString('base64url');
    expect(padded(1_400).length).toBeLessThanOrEqual(2_048);
    expect(stepsFrom(padded(1_400), 'each').steps).toHaveLength(1);
    expect(padded(1_600).length).toBeGreaterThan(2_048);
    expect(stepsFrom(padded(1_600), 'each')).toEqual({ steps: [], bad: true });
    // V0.8.0 pass, review 1, finding 6: the contract requires the header; missing or empty is
    // marked bad.
    expect(stepsFrom(undefined, 'each')).toEqual({ steps: [], bad: true });
    expect(stepsFrom('', 'all')).toEqual({ steps: [], bad: true });
    expect(stepsFrom(encode([]), 'all')).toEqual({ steps: [], bad: false });
  });

  it('marks a bad header in the identity, which still signs in', () => {
    const who = identityFrom({ ...member, 'x-acting-user-steps': '%%%' }, 'all');
    expect(who?.badSteps).toBe(true);
    expect(who?.steps).toEqual([]);
  });
});

describe('the role mapping', () => {
  it('maps admin to game_admin and can-host to organizer, nothing else', () => {
    expect(mappedRoles({ roles: ['admin'], canHost: false })).toEqual(['game_admin']);
    expect(mappedRoles({ roles: ['organiser'], canHost: false })).toEqual([]);
    expect(mappedRoles({ roles: ['member'], canHost: true })).toEqual(['organizer']);
    expect(mappedRoles({ roles: ['admin'], canHost: true })).toEqual(['game_admin', 'organizer']);
    expect(
      mappedRoles({ roles: ['super_admin', 'security_admin', 'moderator'], canHost: false }),
    ).toEqual([]);
  });
});
