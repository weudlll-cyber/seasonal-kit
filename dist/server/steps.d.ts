/**
 * @file   src/server/steps.ts
 * @brief  A member's Discord steps from the website's X-Acting-User-Steps header, checked.
 *
 * Responsibility: the header is base64url of compact JSON: an array of at most three
 *                 `{ ladder, name, icon }`. Each step is checked by the stricter rule of both
 *                 games:
 *                 - exactly those three keys;
 *                 - a known ladder (holder, farmer, investor);
 *                 - a name of 1 to 40 characters after trimming;
 *                 - an icon that is null or exactly the contract's public file,
 *                   "/media/step-icons/<32 hex>.webp" (stricter than both games, after the
 *                   second independent review: no other route of the site can be named); the
 *                   check is `isStepIcon` of ../stepShape, shared with the header since v0.19.0.
 *                 A header over 2 KB, or that is no base64url of a JSON array, gives no steps.
 *                 `mode` is the game's: `each` keeps the steps that hold, at most three (Mini
 *                 Games), `all` gives none when one fails or there are more than three (Bingo).
 *                 `bad` says that the header was missing, or there but not a valid list, for a
 *                 log line: the contract requires it, `[]` for a member without steps.
 *                 Steps never grant rights; only the website's role headers do.
 * Source:         seasonal-mini-games apps/server/src/auth/websiteIdentity.ts (`stepsFrom`) and
 *                 packages/contracts/src/http/session.ts (`PlayerStep`) at 866df03;
 *                 seasonal-bingo-royale packages/contracts/src/http/steps.ts (`parseSteps`) at
 *                 a43209a. No zod: the kit has no runtime dependency. The decoder is ./utf8's,
 *                 shared with ./identity (since v0.10.1).
 * Spec:           Seasonal Entertainment docs/AUTH.md "Embedded games"; GAME-INTEGRATION.md §2
 */
import { type Ladder, type Step } from '../stepShape.js';
export type { Ladder, Step };
export type StepsMode = 'each' | 'all';
export declare function stepsFrom(header: string | undefined, mode: StepsMode): {
    readonly steps: readonly Step[];
    readonly bad: boolean;
};
