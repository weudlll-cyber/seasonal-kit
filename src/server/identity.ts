/**
 * @file   src/server/identity.ts
 * @brief  The visitor the website's proxy names in request headers, checked; the game roles
 *         it maps to; and the sign-in route's decision.
 *
 * Responsibility: `identityFrom` reads the identity headers (names configurable, the contract's
 *                 by default):
 *                 - the website's user id: a positive safe integer without leading zeros (never
 *                   issued twice, so one account has one key);
 *                 - the name, read from its bytes as UTF-8 (D6; malformed bytes are no
 *                   identity): kept as sent (at most 128 characters) and as the game shows it
 *                   (letters, digits, "_", "." and "-", 3 to 24 characters, never cut inside a
 *                   surrogate pair; fewer than 3 usable ones gives "player-" and six hex
 *                   characters of the id's hash);
 *                 - the role: exactly one of member, organiser, admin, as the contract sends it;
 *                   any other value is no identity;
 *                 - whether the e-mail is verified and whether the member may host this game
 *                   (exactly "true");
 *                 - the steps (./steps).
 *                 Node joins a repeated header into one string ("a, b"); a list (from
 *                 `headersDistinct`) counts as missing. The exact-value rules above make a joined
 *                 repeat fail closed: it never adds a role or a flag. `mappedRoles` gives the
 *                 roles beyond the game's own `player`, recomputed at every sign-in: a website
 *                 admin is `game_admin`, a member who may host is `organizer`, and nothing else;
 *                 `super_admin` and `security_admin` never come from the website.
 *                 `websiteSignInCheck` is the sign-in route's whole check, in this order:
 *                 1. the TCP peer must be trusted and the proxy secret right, else `untrusted`;
 *                 2. a guest header that is present and not exactly "false" is a `guest`, even
 *                    when user headers come with it;
 *                 3. no valid id and name is `invalid`;
 *                 4. else a `member` with the checked identity.
 *                 The game answers each kind its own way, so each keeps its behaviour today.
 *                 Header names are compared in lower case, as Node gives them. No I/O. Hardened
 *                 after the independent review of 2026-11-21 (docs/security-pass.md).
 * Source:         seasonal-mini-games apps/server/src/auth/websiteIdentity.ts and
 *                 apps/server/src/http/routes/websiteSignIn.ts at 866df03;
 *                 seasonal-bingo-royale apps/server/src/auth/websiteIdentity.ts and
 *                 apps/server/src/http/routes/websiteSignIn.ts at a43209a. Built on ./trust and
 *                 ./steps.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2, §3; docs/AUTH.md "Embedded
 *                 games"
 */
import { createHash } from 'node:crypto';

import { stepsFrom, type Step, type StepsMode } from './steps.js';
import { secretMatches, trustedPeers, type HeaderValue } from './trust.js';

export interface IdentityHeaders {
  readonly id: string;
  readonly name: string;
  readonly roles: string;
  readonly emailVerified: string;
  readonly canHost: string;
  readonly steps: string;
  readonly guest: string;
}

// The contract's names, lower case as Node gives request headers.
export const IDENTITY_HEADERS: IdentityHeaders = {
  id: 'x-acting-user-id',
  name: 'x-acting-user',
  roles: 'x-acting-user-roles',
  emailVerified: 'x-acting-user-email-verified',
  canHost: 'x-acting-user-can-host',
  steps: 'x-acting-user-steps',
  guest: 'x-acting-guest',
};

export interface WebsiteIdentity {
  readonly subject: string;
  // The name as the website sent it (to notice a change) and as the game shows it.
  readonly websiteName: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly emailVerified: boolean;
  readonly canHost: boolean;
  readonly steps: readonly Step[];
  // The steps header was there but no valid list (a game may log it once).
  readonly badSteps: boolean;
}

export type Headers = Readonly<Record<string, HeaderValue>>;

const SUBJECT = /^[1-9]\d{0,15}$/;
const NAME_CHARS = /[^\p{L}\p{N}_.-]+/gu;
// A high surrogate left alone at the end of a cut string.
const CUT_PAIR = /[\uD800-\uDBFF]$/;

// Node joins a repeated custom header into one string with ", " (only set-cookie stays a
// list; `headersDistinct` gives lists): a list counts as missing, and the flag and role
// headers below accept one exact value only, so a joined pair never passes (v0.8.0 pass, review 1,
// finding 2).
const one = (value: HeaderValue): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

const isTrue = (value: HeaderValue): boolean => one(value)?.toLowerCase() === 'true';

// The name header as text (D6). Node reads a header's bytes as latin1, one character per byte,
// and the website's Node writes a string the same way. The website's usernames are ASCII today
// (seasonal-entertainment shared/accountRules.js:14, sent raw by
// server/src/games/embeddedRoutes.js:53), which this leaves exactly as it is. A name sent as
// UTF-8 bytes ("Jürgen", an emoji) is decoded from them; bytes that are no UTF-8 (a lone
// latin1 "ü", 0xFC) and characters past one byte, which no header carries, make the name null:
// no identity, never a garbled name. So does a decoded name with a control character, a line
// or paragraph separator, or a bidi control (U+200E/F, U+202A–E, U+2066–9, U+061C): it could
// split a log line or show another name than it is (audit 2026-11-22, B1 finding 2).
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const UNSAFE_IN_NAME = /[\p{Cc}\u2028\u2029\u200e\u200f\u202a-\u202e\u2066-\u2069\u061c]/u;

function decodedName(value: string): string | null {
  // A character past one byte (a surrogate half of an emoji included) came from no header.
  if (/[\u0100-\uffff]/.test(value)) return null;
  try {
    const name = UTF8.decode(Buffer.from(value, 'latin1'));
    return UNSAFE_IN_NAME.test(name) ? null : name;
  } catch {
    return null;
  }
}

// The contract's one role per member; nothing else is read as a role.
const ROLES: readonly string[] = ['member', 'organiser', 'admin'];

// The roles header: absent or empty is none (the contract always sends one; its absence grants
// nothing, so it is no reason to refuse a member); one of the contract's values is that role;
// anything else (a list, an unknown role, a joined repeat) is null: no identity at all.
function rolesOf(value: HeaderValue): readonly string[] | null {
  if (value === undefined) return [];
  const role = one(value)?.toLowerCase();
  if (role === undefined) return null;
  if (role === '') return [];
  return ROLES.includes(role) ? [role] : null;
}

// The website's account id: a positive safe integer without leading zeros, so one account
// has one key, and a game that reads it as a number reads it exactly (v0.8.0 pass, review 1,
// finding 7).
const isSubject = (subject: string): boolean =>
  SUBJECT.test(subject) && Number.isSafeInteger(Number(subject));

// Header names as Node gives them: lower case (v0.8.0 pass, review 1, finding 9).
function lowerNames(names: IdentityHeaders): IdentityHeaders {
  return {
    id: names.id.toLowerCase(),
    name: names.name.toLowerCase(),
    roles: names.roles.toLowerCase(),
    emailVerified: names.emailVerified.toLowerCase(),
    canHost: names.canHost.toLowerCase(),
    steps: names.steps.toLowerCase(),
    guest: names.guest.toLowerCase(),
  };
}

function gameName(websiteName: string, subject: string): string {
  const cleaned = websiteName.trim().replace(NAME_CHARS, '_').slice(0, 24).replace(CUT_PAIR, '');
  if (cleaned.replace(/_/g, '').length >= 3) return cleaned;
  return `player-${createHash('sha256').update(subject).digest('hex').slice(0, 6)}`;
}

// A guest unless the header is absent or exactly "false": "true, true" (a joined repeat), an
// empty value or any other value is a guest too. Failing closed keeps a guest from ever being
// read as a member (v0.8.0 pass, review 3, finding 5).
export function isWebsiteGuest(headers: Headers, names = IDENTITY_HEADERS): boolean {
  const value = headers[names.guest.toLowerCase()];
  if (value === undefined) return false;
  return one(value)?.toLowerCase() !== 'false';
}

export function identityFrom(
  headers: Headers,
  steps: StepsMode,
  names = IDENTITY_HEADERS,
): WebsiteIdentity | null {
  const n = lowerNames(names);
  const subject = one(headers[n.id]);
  const sentName = one(headers[n.name]);
  const websiteName = sentName === undefined ? null : decodedName(sentName);
  const roles = rolesOf(headers[n.roles]);
  if (subject === undefined || !isSubject(subject) || !websiteName || roles === null) return null;
  const checked = stepsFrom(one(headers[n.steps]), steps);
  return {
    subject,
    // Never cut inside a surrogate pair (v0.8.0 pass, review 2, finding 7).
    websiteName: websiteName.slice(0, 128).replace(CUT_PAIR, ''),
    displayName: gameName(websiteName, subject),
    roles,
    emailVerified: isTrue(headers[n.emailVerified]),
    canHost: isTrue(headers[n.canHost]),
    steps: checked.steps,
    badSteps: checked.bad,
  };
}

// The roles a member gets beyond the game's own `player`, which every member has: a website
// admin is `game_admin`, a member who may host this game is `organizer`; nothing else, never
// `super_admin` or `security_admin`.
export function mappedRoles(who: Pick<WebsiteIdentity, 'roles' | 'canHost'>): readonly string[] {
  return [
    ...(who.roles.includes('admin') ? ['game_admin'] : []),
    ...(who.canHost ? ['organizer'] : []),
  ];
}

export interface SignInCheck {
  // The game's trusted proxy addresses and ranges, its secret and its secret's header name.
  readonly trustedProxies: readonly string[];
  readonly proxySecret: string;
  readonly secretHeader: string;
  readonly steps: StepsMode;
  readonly names?: IdentityHeaders;
}

export type SignInDecision =
  | { readonly kind: 'untrusted' }
  | { readonly kind: 'guest' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'member'; readonly identity: WebsiteIdentity };

// Built once per route: the trust list and the hashed secret are made here, not per request.
// `peer` is the TCP peer, `req.socket.remoteAddress`, never a framework's `req.ip`: with a
// trusted-proxy setting that reads a forwarding header anyone can send (audit 2026-11-22, B1).
export function websiteSignInCheck(
  check: SignInCheck,
): (peer: string | undefined, headers: Headers) => SignInDecision {
  const trusted = trustedPeers(check.trustedProxies);
  const fromProxy = secretMatches(check.proxySecret);
  const names = lowerNames(check.names ?? IDENTITY_HEADERS);
  const secretHeader = check.secretHeader.toLowerCase();
  return (peer, headers) => {
    // Both checks always run, so the answer's timing says nothing about which one failed.
    const peerOk = trusted(peer);
    const secretOk = fromProxy(headers[secretHeader]);
    if (!peerOk || !secretOk) return { kind: 'untrusted' };
    if (isWebsiteGuest(headers, names)) return { kind: 'guest' };
    const identity = identityFrom(headers, check.steps, names);
    return identity === null ? { kind: 'invalid' } : { kind: 'member', identity };
  };
}
