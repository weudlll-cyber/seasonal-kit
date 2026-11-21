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

import { identityFrom, isWebsiteGuest, mappedRoles, websiteSignInCheck } from './identity.js';
import { stepsFrom } from './steps.js';
import { secretMatches, trustedPeers } from './trust.js';

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const step = (name: string, icon: string | null = '/media/step-icons/ab.webp') => ({
  ladder: 'holder',
  name,
  icon,
});
const member = { 'x-acting-user-id': '42', 'x-acting-user': 'Walter W.' };

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

describe('the sign-in decision', () => {
  const decide = websiteSignInCheck({
    trustedProxies: ['127.0.0.1'],
    proxySecret: 'proxy-secret',
    secretHeader: 'x-smg-proxy-secret',
    steps: 'each',
  });
  const fromProxy = { 'x-smg-proxy-secret': 'proxy-secret' };

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

describe('the identity headers', () => {
  it('needs a numeric id of at most 20 digits and a name, each sent once', () => {
    expect(identityFrom({ ...member, 'x-acting-user-id': 'u-1' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': '1'.repeat(21) }, 'each')).toBeNull();
    expect(identityFrom({ 'x-acting-user-id': '42' }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user-id': ['42', '43'] }, 'each')).toBeNull();
    expect(identityFrom({ ...member, 'x-acting-user': ['a', 'b'] }, 'each')).toBeNull();
  });

  it('makes the name fit, keeps the website name, reads the flags', () => {
    const who = identityFrom(
      {
        ...member,
        'x-acting-user-roles': 'member, Admin',
        'x-acting-user-email-verified': 'true',
        'x-acting-user-can-host': 'TRUE',
      },
      'each',
    );
    expect(who).toMatchObject({
      subject: '42',
      websiteName: 'Walter W.',
      displayName: 'Walter_W.',
      roles: ['member', 'admin'],
      emailVerified: true,
      canHost: true,
      steps: [],
      badSteps: false,
    });
    expect(identityFrom({ ...member, 'x-acting-user': '!!' }, 'each')?.displayName).toMatch(
      /^player-[0-9a-f]{6}$/,
    );
    // "𝒜" is a letter of two UTF-16 units: the cut at 24 would split it, so it goes.
    const long = identityFrom({ ...member, 'x-acting-user': `${'a'.repeat(23)}𝒜b` }, 'each');
    expect(long?.displayName).toBe('a'.repeat(23));
    expect(
      identityFrom({ ...member, 'x-acting-user': 'x'.repeat(200) }, 'each')?.websiteName,
    ).toHaveLength(128);
  });

  it('tells a guest from a member', () => {
    expect(isWebsiteGuest({ 'x-acting-guest': 'true' })).toBe(true);
    expect(isWebsiteGuest({ 'x-acting-guest': 'false' })).toBe(false);
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

  it('refuses a foreign icon, an unknown ladder, extra keys and bad names', () => {
    const steps = [
      step('Away', 'https://evil.example/x.webp'),
      step('Relative', '//evil.example/x.webp'),
      step('Back', '/media\\x.webp'),
      step('Query', '/media/x.webp?track=1'),
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
      steps: [{ ladder: 'holder', name: 'Kept', icon: '/media/step-icons/ab.webp' }],
      bad: true,
    });
    expect(stepsFrom(encode(steps), 'all').steps).toEqual([]);
  });

  it('gives no steps for bad base64url, bad JSON or UTF-8, a non-array or an oversized header', () => {
    expect(stepsFrom('%%%', 'each')).toEqual({ steps: [], bad: true });
    expect(stepsFrom(Buffer.from('{not json').toString('base64url'), 'each').steps).toEqual([]);
    expect(stepsFrom(Buffer.from([0xff, 0xfe]).toString('base64url'), 'each').steps).toEqual([]);
    expect(stepsFrom(encode({ ladder: 'holder' }), 'each').steps).toEqual([]);
    expect(stepsFrom('a'.repeat(5_000), 'each').steps).toEqual([]);
    expect(stepsFrom(undefined, 'each')).toEqual({ steps: [], bad: false });
    expect(stepsFrom('', 'all')).toEqual({ steps: [], bad: false });
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
