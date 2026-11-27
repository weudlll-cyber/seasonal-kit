/**
 * @file   src/testing/standInContract.ts
 * @brief  What the stand-in website answers: the authorize route's decision, the season feed and
 *         the check of a game's open rounds, each line of the website's contract in one place.
 *
 * Responsibility: pure functions the stand-in server (./websiteStandIn) uses:
 *                 - `authorize(request, member)`: the website's answer to
 *                   `GET /api/games/<slug>/authorize`: 405 for another method; 403 without a known
 *                   `X-Original-Method`, or for a state-changing one whose `Origin` is not the
 *                   website's; else 204, never 401: a member's six `X-Acting-User*` headers
 *                   (steps as base64url of compact JSON) or `X-Acting-Guest: true` alone;
 *                 - `seasonFeed(now)`: the public season feed, version 1;
 *                 - `checkOpenRounds(page, origin, now)`: reads a game's open-rounds page as the
 *                   website does: a page that is not the contract's throws; each round that breaks a
 *                   rule is dropped with the rule it broke, and only the first 20 are read.
 * Depends on:     ../stepShape
 * Source:         new in the kit (K74), after seasonal-mini-games and seasonal-cases
 *                 e2e/websiteStub.ts and seasonal-bingo-royale e2e/websiteStack.ts.
 * Spec:           website docs/AUTH.md "Embedded games" and server/src/games/embeddedRoutes.js
 *                 (authorize), docs/GAME-INTEGRATION.md "Season feed", docs/OPEN-ROUNDS.md and
 *                 server/src/games/openRoundsContract.js (the code decides where the page reads
 *                 differently: an empty `kind` is allowed), all at cc743b9
 */
import type { Step } from '../stepShape.js';

export interface StandInMember {
  // The website's account id (never issued twice).
  readonly id: number;
  readonly name: string;
  readonly role: 'member' | 'organiser' | 'admin';
  // Whether this member may host the game; an admin always may.
  readonly canHost?: boolean;
  // Whether the website verified their e-mail (since v0.36.0); left out: verified.
  readonly emailVerified?: boolean;
  readonly steps?: readonly Step[];
}

export interface AuthorizeRequest {
  readonly method: string;
  // The browser's method, as the proxy passes it on.
  readonly originalMethod: string | undefined;
  readonly origin: string | undefined;
  readonly siteOrigin: string;
}

export interface AuthorizeAnswer {
  readonly status: 204 | 403 | 405;
  readonly headers: Readonly<Record<string, string>>;
}

const SAFE = ['GET', 'HEAD', 'OPTIONS'];
const CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function authorize(
  request: AuthorizeRequest,
  member: StandInMember | null,
): AuthorizeAnswer {
  const headers = { 'cache-control': 'no-store' };
  if (request.method !== 'GET') return { status: 405, headers };
  const original = (request.originalMethod ?? '').toUpperCase();
  const changing = CHANGING.includes(original);
  // An unknown or missing original method fails closed.
  if (!changing && !SAFE.includes(original)) return { status: 403, headers };
  if (changing && request.origin !== request.siteOrigin) return { status: 403, headers };
  if (member === null) {
    return { status: 204, headers: { ...headers, 'x-acting-guest': 'true' } };
  }
  return {
    status: 204,
    headers: {
      ...headers,
      'x-acting-user-id': String(member.id),
      'x-acting-user': member.name,
      'x-acting-user-roles': member.role,
      'x-acting-user-email-verified': String(member.emailVerified !== false),
      'x-acting-user-can-host': String(member.role === 'admin' || member.canHost === true),
      'x-acting-user-steps': Buffer.from(JSON.stringify(member.steps ?? [])).toString('base64url'),
    },
  };
}

const DAY_MS = 86_400_000;
const day = (at: number): string => new Date(at).toISOString().slice(0, 10);

export function seasonFeed(now: number): Readonly<Record<string, unknown>> {
  return {
    v: 1,
    inSeason: {
      season: 'autumn',
      token: 'AUTUMN',
      since: new Date(now - 90 * DAY_MS).toISOString(),
    },
    // From 30 days ago to the two years ahead, oldest first.
    halvingDays: [
      { day: day(now - 30 * DAY_MS), token: 'SUMMER' },
      { day: day(now + 100 * DAY_MS), token: 'AUTUMN' },
    ],
  };
}

export interface OpenRoundsRead {
  readonly rounds: readonly Readonly<Record<string, unknown>>[];
  // "round 2: players" for each round left out.
  readonly dropped: readonly string[];
}

type Round = Readonly<Record<string, unknown>>;

// The website's checks (server/src/games/openRoundsContract.js).
const text =
  (max: number, empty = false) =>
  (v: unknown): boolean =>
    typeof v === 'string' && v.length <= max && (empty || v.trim() !== '');
const count =
  (least: number) =>
  (v: unknown): boolean =>
    Number.isInteger(v) && Number(v) >= least;
// ISO 8601 in UTC ("…Z"), or null.
const utc = (v: unknown): boolean =>
  v === null || (typeof v === 'string' && v.endsWith('Z') && !Number.isNaN(Date.parse(v)));

// The first rule a round breaks, or null.
function brokenRule(round: Round, origin: string, now: number): string | null {
  const joins = (v: unknown): boolean => {
    if (typeof v !== 'string' || !URL.canParse(v)) return false;
    const url = new URL(v);
    return url.protocol === 'https:' && url.origin === origin;
  };
  const closes = round['signupClosesAt'];
  const rules: [string, boolean][] = [
    ['id', text(64)(round['id'])],
    ['title', text(80)(round['title'])],
    ['kind', text(40, true)(round['kind'])],
    ['startsAt', utc(round['startsAt'])],
    ['signupClosesAt', utc(closes)],
    ['sign-up closed', typeof closes !== 'string' || Date.parse(closes) > now],
    ['players', count(0)(round['players'])],
    ['maxPlayers', round['maxPlayers'] === null || count(1)(round['maxPlayers'])],
    ['joinUrl', joins(round['joinUrl'])],
  ];
  return rules.find(([, kept]) => !kept)?.[0] ?? null;
}

export function checkOpenRounds(page: unknown, origin: string, now: number): OpenRoundsRead {
  const { version, rounds } = (page ?? {}) as { version?: unknown; rounds?: unknown };
  if (!Number.isInteger(version)) throw new Error('not the open-rounds contract: no version');
  // A newer contract than the website knows counts as no rounds.
  if (Number(version) > 1) return { rounds: [], dropped: [] };
  if (version !== 1 || !Array.isArray(rounds)) throw new Error('not the open-rounds contract');
  const kept: Round[] = [];
  const dropped: string[] = [];
  rounds.slice(0, 20).forEach((entry: unknown, i) => {
    const round = (typeof entry === 'object' && entry !== null ? entry : {}) as Round;
    const broken = brokenRule(round, origin, now);
    if (broken === null) kept.push(round);
    else dropped.push(`round ${String(i + 1)}: ${broken}`);
  });
  return { rounds: kept, dropped };
}
