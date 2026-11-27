/**
 * @file   src/react/ChatDock.tsx
 * @brief  The docked chat: a strip under the game on a desktop, a bar with a sheet on a phone,
 *         and the reserved call slot beside or above it.
 *
 * Responsibility: on a desktop a full-width strip of fixed height (190 px, 150 px in a window
 *                 under 760 px high, ../../css/dock.css), always in sight, with the chat on the
 *                 left and the call slot at its right end at the strip's full height. On a phone
 *                 the bar at the bottom of the screen, in the layout: "Chat · <newest message>"
 *                 and the unread count, which opens the chat as a sheet above the bar. The sheet
 *                 takes the focus (since v0.10.0); Escape or Close shut it and hand the focus
 *                 back. In the bar's form `field` the game's
 *                 own writing field sits under it. The call slot is the 48 px strip directly
 *                 above the bar. The slot is hidden while no call id is set (../callSlot); with one
 *                 it frames the website's call view (./CallSlotBox, since v0.13.0). With
 *                 `onSharedCall` the slot holds the view of the one call shared with the games
 *                 instead (./SharedCall, since v0.37.0), in the same places.
 *                 Unread counts only while the chat is out of sight (../chatArrivals); the dock
 *                 provides its arrivals to the chat inside (./dockSight). A changed count is
 *                 announced in a polite live region (role status, since v0.10.1), never on the
 *                 first render. `onUnread` hands each new count to the game, for its bar's chat
 *                 button (since v0.11.0). The same element holds
 *                 the chat in both layouts, so turning a phone does not reload it. Inside a
 *                 ./DockedScreen it tells the game what "open the chat" means (./dockHandOver,
 *                 since v0.13.0).
 * Source:         seasonal-mini-games apps/web/src/match/ChatDock.tsx and chatDock.css at 866df03
 *                 (`useArrivals`, `PhoneBar`, `Body`); Bingo's chat is a side panel instead
 *                 (apps/web/src/shell/ChatDock.tsx at a43209a). Built on ../chatArrivals
 *                 (createChatArrivals, chatBarText), ./CallSlotBox, ./SharedCall and
 *                 ./useDisclosure.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §5 and §9 (at e7b995c)
 */
import { type ReactElement, type ReactNode } from 'react';
import { type SharedCallSlotProps } from './SharedCall.js';
export interface ChatDockProps {
    readonly chat: ReactNode;
    readonly phone: boolean;
    readonly bar: 'field' | 'line';
    readonly field?: ReactNode;
    readonly callId: number | null;
    readonly onUnread?: (count: number) => void;
    readonly callPath?: string;
    readonly onSharedCall?: SharedCallSlotProps['onCall'] | undefined;
}
export declare function ChatDock(p: ChatDockProps): ReactElement;
