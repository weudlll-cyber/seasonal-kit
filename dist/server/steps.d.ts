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
 *                 - an icon that is null or a path on the website: one leading slash, then at
 *                   most 255 of letters, digits, "_", ".", "~", "/" and "-", never a scheme, a
 *                   host or a backslash.
 *                 A header over 2 KB, or that is no base64url of a JSON array, gives no steps.
 *                 `mode` is the game's: `each` keeps the steps that hold, at most three (Mini
 *                 Games), `all` gives none when one fails or there are more than three (Bingo).
 *                 `bad` says that the header was there but not a valid list, for a log line.
 *                 Steps never grant rights; only the website's role headers do.
 * Source:         seasonal-mini-games apps/server/src/auth/websiteIdentity.ts (`stepsFrom`) and
 *                 packages/contracts/src/http/session.ts (`PlayerStep`) at 866df03;
 *                 seasonal-bingo-royale packages/contracts/src/http/steps.ts (`parseSteps`) at
 *                 a43209a. No zod: the kit has no runtime dependency.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Embedded games"; GAME-INTEGRATION.md §2
 */
export type Ladder = 'holder' | 'farmer' | 'investor';
export interface Step {
    readonly ladder: Ladder;
    readonly name: string;
    readonly icon: string | null;
}
export type StepsMode = 'each' | 'all';
export declare function stepsFrom(header: string | undefined, mode: StepsMode): {
    readonly steps: readonly Step[];
    readonly bad: boolean;
};
