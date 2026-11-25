/**
 * @file   src/react/GameBar.tsx
 * @brief  The slim game bar during a round, in place of the app header (focus mode), and its
 *         line icons.
 *
 * Responsibility: one row, at most 44 px on a desktop (../../css/bar.css):
 *                 the way back to the website, if the game passes `back` (./BackLink, reused;
 *                 arrow and words on a desktop, the arrow alone on a phone with the words as its
 *                 name; since v0.12.0), the game's lead part (its season pill), its facts ("Shared"; a desktop-only
 *                 fact is read out on a phone), the time ("9:50 left"; a phone shows "9:50" and
 *                 reads " left" out), then the buttons of the panels on demand (./usePanels).
 *                 Each button has its icon and words: a desktop shows both, a phone shows the
 *                 icon and reads the words out. A button may name the panel it opens (`controls`,
 *                 its `aria-controls`, since v0.20.0). A button may carry an unread count, never the
 *                 only sign ("3 unread"). The full-screen toggle shows only where the browser
 *                 offers it (./useFullscreen). A toggle (the sound, since v0.11.0) switches a
 *                 setting in place, `aria-pressed` saying whether it is on. A press button
 *                 (`presses`, since v0.13.0, e.g. "Applaud") only sends a press: no panel, no
 *                 state, the same button and icon parts. Which buttons there
 *                 are (chat, players, host, prefs since v0.12.0) is the game's: a game without a chat passes no chat
 *                 button; the chat button's unread count comes from the dock's `onUnread`
 *                 (./ChatDock, since v0.11.0). `buttonClassName`
 *                 lets a game keep its own button look (Mini Games: `smg-btn`).
 * Source:         seasonal-mini-games apps/web/src/round/FocusBar.tsx and FocusIcons.tsx at
 *                 866df03 (its season pill, mode, `barTime` and panel ids stay in the game);
 *                 Bingo has no game bar (a43209a). Built on ./usePanels, ./useFullscreen.
 * Spec:           Mini Games DECISIONS O46, O47, T141
 */
import type { ReactElement, ReactNode } from 'react';
import type { Fullscreen } from './useFullscreen.js';
import type { Panels } from './usePanels.js';
import { type BackLinkProps } from './BackLink.js';
declare const PANEL_PATHS: {
    readonly chat: "M4 5h16v10H9l-4 4v-4H4z";
    readonly players: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.4 3 5";
    readonly host: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5";
    readonly prefs: "M6 4v6M6 14v6M3.5 12h5M12 4v2M12 10v10M9.5 8h5M18 4v10M18 18v2M15.5 16h5";
};
declare const PRESS_PATHS: {
    readonly applaud: "M9 21l-3-6 4-8 2 1-2 5 4-7 2 1-3 6 3-4 2 1-4 7-2 4zM14 2v2M18 3l-1 2M20 7h-2";
};
export type BarIconName = keyof typeof PANEL_PATHS;
export type BarPressIconName = keyof typeof PRESS_PATHS;
export interface BarAction<Id extends string> {
    readonly id: Id;
    readonly icon: BarIconName;
    readonly label: string;
    readonly testId?: string;
    readonly badge?: number;
    readonly controls?: string;
}
export interface BarToggle {
    readonly id: string;
    readonly icon: 'sound';
    readonly label: string;
    readonly on: boolean;
    readonly onToggle: () => void;
    readonly testId?: string;
}
export interface BarPress {
    readonly id: string;
    readonly icon: BarPressIconName;
    readonly label: string;
    readonly onPress: () => void;
    readonly tip?: string;
    readonly testId?: string;
}
export interface BarFact {
    readonly text: ReactNode;
    readonly desktopOnly?: boolean;
}
export interface GameBarProps<Id extends string> {
    readonly back?: BackLinkProps;
    readonly lead?: ReactNode;
    readonly facts?: readonly BarFact[];
    readonly time: {
        readonly text: string;
        readonly left: boolean;
    } | null;
    readonly actions: readonly BarAction<Id>[];
    readonly toggles?: readonly BarToggle[];
    readonly presses?: readonly BarPress[];
    readonly panels: Panels<Id>;
    readonly fullscreen?: Fullscreen;
    readonly buttonClassName?: string;
}
export declare function GameBar<Id extends string>(p: GameBarProps<Id>): ReactElement;
export {};
