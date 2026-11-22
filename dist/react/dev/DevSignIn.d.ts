/**
 * @file   src/react/dev/DevSignIn.tsx
 * @brief  Development only: the "Dev sign-in" menu, one click per test identity.
 *
 * Responsibility: one compact button that opens a menu of the game's test identities (Bingo:
 *                 host and three players; Mini Games: those and admin), each signing in with one
 *                 click through the game's `onSignIn` (its POST to the dev sign-in route). A hint
 *                 says that one window holds one sign-in. A plain disclosure (the button's
 *                 aria-expanded, buttons in a panel), not an ARIA menu: a menu would promise
 *                 arrow keys it does not have (audit 2026-11-22, B7 finding 1). Escape or a pick
 *                 closes the menu and gives the focus back to the button; a press outside closes
 *                 it and leaves the focus to the press (since v0.10.1, ../usePressOutside, as
 *                 the header's fold). A sign-in that fails (the promise rejects) is shown as an
 *                 alert naming the identity's label under the button until the next try. The
 *                 game loads this module lazily and only when its dev flag is set
 *                 (`import.meta.env.DEV`), and passes it into
 *                 ../AppHeader's `devTools` slot; its strings are in `KIT_DEV_MARKERS`
 *                 (../../devtools), which the production-bundle test looks for.
 * Source:         seasonal-bingo-royale apps/web/src/shell/DevTools.tsx (`DevSignIn`) at a43209a,
 *                 the identities and the call the game's. Built on ../useDisclosure and
 *                 ../usePressOutside.
 */
import { type ReactElement } from 'react';
export interface DevIdentity {
    readonly as: string;
    readonly label: string;
}
export interface DevSignInProps {
    readonly identities: readonly DevIdentity[];
    readonly onSignIn: (as: string) => Promise<void>;
    readonly buttonClassName?: string;
}
export declare function DevSignIn(p: DevSignInProps): ReactElement;
