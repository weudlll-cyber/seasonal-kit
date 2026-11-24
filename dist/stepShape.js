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
// A member has at most three steps (one per ladder): the website's header carries no more.
export const MAX_STEPS = 3;
// The contract's icon, exactly: "/media/step-icons/<32 hex>.webp" (v0.8.0 pass, review 2, finding
// 3).
const ICON = /^\/media\/step-icons\/[0-9a-f]{32}\.webp$/;
// True for exactly the contract's icon address, and for nothing else (a non-string included).
export function isStepIcon(icon) {
    return typeof icon === 'string' && ICON.test(icon);
}
