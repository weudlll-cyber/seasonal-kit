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
 *                 above the bar. The slot is hidden while no call id is set (../callSlot), and
 *                 nothing is framed in it: the site's call page does not exist yet (BACKLOG 8).
 *                 Unread counts only while the chat is out of sight (../chatArrivals); the dock
 *                 provides its arrivals to the chat inside (./dockSight). The same element holds
 *                 the chat in both layouts, so turning a phone does not reload it.
 * Source:         seasonal-mini-games apps/web/src/match/ChatDock.tsx and chatDock.css at 866df03
 *                 (`useArrivals`, `PhoneBar`, `Body`); Bingo's chat is a side panel instead
 *                 (apps/web/src/shell/ChatDock.tsx at a43209a). Built on ../chatArrivals
 *                 (createChatArrivals, chatBarText), ../callSlot (callSlot) and ./useDisclosure.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §5 and §9 (at e7b995c)
 */
import { type ReactElement, type ReactNode } from 'react';
export interface ChatDockProps {
    readonly chat: ReactNode;
    readonly phone: boolean;
    readonly bar: 'field' | 'line';
    readonly field?: ReactNode;
    readonly callId: number | null;
}
export declare function ChatDock(p: ChatDockProps): ReactElement;
