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
    readonly id: number;
    readonly name: string;
    readonly role: 'member' | 'organiser' | 'admin';
    readonly canHost?: boolean;
    readonly steps?: readonly Step[];
}
export interface AuthorizeRequest {
    readonly method: string;
    readonly originalMethod: string | undefined;
    readonly origin: string | undefined;
    readonly siteOrigin: string;
}
export interface AuthorizeAnswer {
    readonly status: 204 | 403 | 405;
    readonly headers: Readonly<Record<string, string>>;
}
export declare function authorize(request: AuthorizeRequest, member: StandInMember | null): AuthorizeAnswer;
export declare function seasonFeed(now: number): Readonly<Record<string, unknown>>;
export interface OpenRoundsRead {
    readonly rounds: readonly Readonly<Record<string, unknown>>[];
    readonly dropped: readonly string[];
}
export declare function checkOpenRounds(page: unknown, origin: string, now: number): OpenRoundsRead;
