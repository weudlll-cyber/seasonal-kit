/**
 * @file   src/server/identity.ts
 * @brief  The visitor the website's proxy names in request headers, checked; the game roles
 *         it maps to; and the sign-in route's decision.
 *
 * Responsibility: `identityFrom` reads the identity headers (names configurable, the contract's
 *                 by default):
 *                 - the website's numeric user id (1 to 20 digits, never issued twice);
 *                 - the name: kept as sent (at most 128 characters) and as the game shows it
 *                   (letters, digits, "_", "." and "-", 3 to 24 characters, never cut inside a
 *                   surrogate pair; fewer than 3 usable ones gives "player-" and six hex
 *                   characters of the id's hash);
 *                 - the roles, whether the e-mail is verified and whether the member may host
 *                   this game;
 *                 - the steps (./steps).
 *                 A repeated header counts as missing. `mappedRoles` maps them to game roles,
 *                 recomputed at every sign-in: a website admin is `game_admin`, a member who may
 *                 host is `organizer`, and nothing else; `super_admin` and `security_admin` never
 *                 come from the website. `decideWebsiteSignIn` is the sign-in route's whole
 *                 check, in this order:
 *                 1. the TCP peer must be trusted and the proxy secret right, else `untrusted`;
 *                 2. `X-Acting-Guest: true` is a `guest`, even when user headers come with it;
 *                 3. no valid id and name is `invalid`;
 *                 4. else a `member` with the checked identity.
 *                 The game answers each kind its own way, so each keeps its behaviour today.
 *                 No I/O.
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

const SUBJECT = /^\d{1,20}$/;
const NAME_CHARS = /[^\p{L}\p{N}_.-]+/gu;
// A high surrogate left alone at the end of a cut string.
const CUT_PAIR = /[\uD800-\uDBFF]$/;

const one = (value: HeaderValue): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

const isTrue = (value: HeaderValue): boolean => one(value)?.toLowerCase() === 'true';

function gameName(websiteName: string, subject: string): string {
  const cleaned = websiteName.trim().replace(NAME_CHARS, '_').slice(0, 24).replace(CUT_PAIR, '');
  if (cleaned.replace(/_/g, '').length >= 3) return cleaned;
  return `player-${createHash('sha256').update(subject).digest('hex').slice(0, 6)}`;
}

export function isWebsiteGuest(headers: Headers, names = IDENTITY_HEADERS): boolean {
  return isTrue(headers[names.guest]);
}

export function identityFrom(
  headers: Headers,
  steps: StepsMode,
  names = IDENTITY_HEADERS,
): WebsiteIdentity | null {
  const subject = one(headers[names.id]);
  const websiteName = one(headers[names.name]);
  if (subject === undefined || !SUBJECT.test(subject) || !websiteName) return null;
  const roles = (one(headers[names.roles]) ?? '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
  const checked = stepsFrom(one(headers[names.steps]), steps);
  return {
    subject,
    websiteName: websiteName.slice(0, 128),
    displayName: gameName(websiteName, subject),
    roles,
    emailVerified: isTrue(headers[names.emailVerified]),
    canHost: isTrue(headers[names.canHost]),
    steps: checked.steps,
    badSteps: checked.bad,
  };
}

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
export function websiteSignInCheck(
  check: SignInCheck,
): (peer: string | undefined, headers: Headers) => SignInDecision {
  const trusted = trustedPeers(check.trustedProxies);
  const fromProxy = secretMatches(check.proxySecret);
  const names = check.names ?? IDENTITY_HEADERS;
  return (peer, headers) => {
    // Both checks always run, so the answer's timing says nothing about which one failed.
    const peerOk = trusted(peer);
    const secretOk = fromProxy(headers[check.secretHeader]);
    if (!peerOk || !secretOk) return { kind: 'untrusted' };
    if (isWebsiteGuest(headers, names)) return { kind: 'guest' };
    const identity = identityFrom(headers, check.steps, names);
    return identity === null ? { kind: 'invalid' } : { kind: 'member', identity };
  };
}
