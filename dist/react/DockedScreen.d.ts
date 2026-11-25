/**
 * @file   src/react/DockedScreen.tsx
 * @brief  A game screen with the docked chat: what the game shows now on top, the chat under it,
 *         one screen.
 *
 * Responsibility: one box, as high as its container, with the game's content (the start card,
 *                 the round, the result) on top, taking the height the chat leaves, and
 *                 ./ChatDock under it. The dock keeps its place in this box whatever is above it,
 *                 so React keeps it mounted from the round to the result and back: its room and
 *                 what was typed survive. The layout, desktop or phone, is ./dockSight
 *                 `useDockView`. On a phone the content scrolls alone above the chat bar, and the
 *                 visible viewport's height is published as `--sk-visible-height` on <html>: the
 *                 game's root (the element a screen high) takes it, so the bar stays directly
 *                 above the on-screen keyboard. With `withoutChat` (since v0.12.0) there is no
 *                 dock at all, no strip and no sheet, and the content still follows the keyboard
 *                 the same way (Mini Games T416). The box itself never takes the viewport's height:
 *                 it may sit under other parts of the page (v0.7.0, found by the showcase). The
 *                 content's box is one Tab stop, the region "Game screen", so a keyboard can
 *                 scroll it (since v0.27.0).
 * Source:         seasonal-mini-games apps/web/src/match/DockedMatch.tsx and docked.css at 866df03
 *                 (`useVisibleHeight` set the app's #root height; here a custom property the
 *                 game's root reads).
 */
import { type ReactElement, type ReactNode } from 'react';
import { type ChatDockProps } from './ChatDock.js';
export type DockedScreenProps = {
    readonly children: ReactNode;
} & ((Omit<ChatDockProps, 'phone'> & {
    readonly withoutChat?: false;
}) | {
    readonly withoutChat: true;
});
export declare function DockedScreen(p: DockedScreenProps): ReactElement;
