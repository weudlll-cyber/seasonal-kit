/**
 * @file   src/stepShape.ts
 * @brief  A member's Discord step as the website's contract has it, and the one check of its
 *         icon address: shared by the server (./server/steps) and the header (./react/AppHeader).
 *
 * Responsibility: the `Step` shape (`ladder`, `name`, `icon`), `MAX_STEPS` (three) and
 *                 `isStepIcon`, the exact form of
 *                 an icon address, "/media/step-icons/<32 hex>.webp" and nothing else: no other
 *                 route of the site, no other host, no query. It holds no server code (no Node
 *                 API), so a browser bundle can import it. The server's `stepsFrom` applies the
 *                 check to the website's header; the header applies the same check again before
 *                 it draws an `<img>`, so a game that passes steps from anywhere cannot name
 *                 another address (since v0.19.0; before, the check lived in ./server/steps).
 * Source:         moved unchanged from ./server/steps.ts (`Ladder`, `Step`, `ICON`), which has
 *                 it from seasonal-mini-games packages/contracts/src/http/session.ts
 *                 (`PlayerStep`) at 866df03 and seasonal-bingo-royale
 *                 packages/contracts/src/http/steps.ts at a43209a.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Embedded games"; GAME-INTEGRATION.md §2
 */
export type Ladder = 'holder' | 'farmer' | 'investor';
export interface Step {
    readonly ladder: Ladder;
    readonly name: string;
    readonly icon: string | null;
}
export declare const MAX_STEPS = 3;
export declare function isStepIcon(icon: unknown): icon is string;
