/**
 * @file   src/react/AppHeader.tsx
 * @brief  The shared app header of every game (DECISIONS K21): back link, brand, navigation,
 *         account, the development tools where the game passes them, and the theme toggle.
 *
 * Responsibility: one bar, in this order, on screen and in the DOM alike, so the tab order is
 *                 the order shown (since v0.10.0; audit 2026-11-22, B7 finding 4):
 *                 1. in website mode "← Seasonal Entertainment" (./BackLink);
 *                 2. the brand: the game's emblem, its name and the "Seasonal Entertainment"
 *                    wordmark, a link to the game's start;
 *                 3. the navigation: the game's links, the current one `aria-current="page"`,
 *                    then anything the game adds (its chat button, a Quick Test link);
 *                 4. the account: signed in, the chip "name (role)" to the account page and
 *                    "Sign out"; signed out, "Sign in" and "Register", or in website mode one
 *                    "Sign in" to the website; the member's step badges (`steps`, since
 *                    v0.19.0) sit as small icons in the chip, drawn only for the website's own
 *                    icon addresses (../stepShape), in the folded menu too;
 *                 5. the development tools, rendered only when the game passes them (its lazily
 *                    loaded ./dev DevSignIn, behind its dev flag);
 *                 6. the theme toggle (./theme).
 *                 When they would not fit on one row, the navigation and the account fold
 *                 into one menu button (./MenuFold, ./useHeaderFold; since v0.11.0, measured
 *                 before the paint; the step badges give way first, since v0.33.0; a game may also name a width under which it always folds, `foldBelow`,
 *                 since v0.13.0). Its sizes keep the game's floors
 *                 (../../css/header.css, K14). The words of the links, the role and the routes
 *                 are the game's; the header holds only their places.
 * Source:         seasonal-bingo-royale apps/web/src/shell/AppShell.tsx (the bar, `Nav`,
 *                 `Account`) and shell.css at a43209a: Bingo's test server's header, which the
 *                 owner made every game's (D5, 2026-11-21). Built on ./BackLink, ./theme
 *                 (ThemeToggle) and ./MenuFold.
 */
import type { ReactElement, ReactNode } from 'react';
import type { Step } from '../stepShape.js';
export interface HeaderLink {
    readonly href: string;
    readonly label: string;
    readonly active: boolean;
}
export interface HeaderAccount {
    readonly name: string;
    readonly role: string;
    readonly href: string;
    readonly onSignOut: () => void;
    readonly steps?: readonly Step[];
}
export interface AppHeaderProps {
    readonly websiteMode: boolean;
    readonly brand: {
        readonly href: string;
        readonly emblem: ReactNode;
        readonly name: string;
    };
    readonly links: readonly HeaderLink[];
    readonly navExtra?: ReactNode;
    readonly account: HeaderAccount | null;
    readonly signIn: {
        readonly href: string;
        readonly registerHref?: string;
    };
    readonly devTools?: ReactNode;
    readonly closeKey: string;
    readonly buttonClassName?: string;
    readonly foldBelow?: number;
}
export declare function AppHeader(p: AppHeaderProps): ReactElement;
