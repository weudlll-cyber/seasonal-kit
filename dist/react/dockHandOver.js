/**
 * @file   src/react/dockHandOver.ts
 * @brief  A game opens the docked chat from inside the game (since v0.13.0, Cases 43).
 *
 * Responsibility: ./DockedScreen provides one slot, ./ChatDock puts into it what "open the chat"
 *                 means in its layout (on a phone it opens the sheet above the bar, which takes
 *                 the focus; on a desktop, where the strip is always in sight, it moves the focus
 *                 into the strip), and `useOpenDockChat` hands the game a stable function that
 *                 calls it. The game's bar, outside the dock, can then make its Chat button open
 *                 the dock's chat instead of a panel of its own, so the website's chat stays
 *                 mounted once (GAME-INTEGRATION §5). Outside a docked screen, or in one
 *                 `withoutChat`, the function does nothing.
 * Source:         seasonal-cases packages/ui/src/pending/useChatHandOver.ts at 073f9ad, which
 *                 pressed the dock's `sk-chat-bar` or focused its iframe through the DOM; here
 *                 it is the dock's own state (./useDisclosure `show`).
 */
import { createContext, useCallback, useContext } from 'react';
export const DockHandOver = createContext(null);
export function useOpenDockChat() {
    const slot = useContext(DockHandOver);
    return useCallback(() => {
        slot?.current?.();
    }, [slot]);
}
