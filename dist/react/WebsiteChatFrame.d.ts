/**
 * @file   src/react/WebsiteChatFrame.tsx
 * @brief  The website's chat in a frame titled "Chat", talking to the page through the
 *         checked `seasonal-chat` link.
 *
 * Responsibility: the frame loads the website's embed page for the game's room, with the
 *                 theme the page shows (a change of theme loads it anew, as in both games today).
 *                 Its request carries this site's origin as its referrer (`strict-origin`),
 *                 which the embed needs in Firefox to know its parent (GAME-INTEGRATION §5,
 *                 required). Inside a dock (./dockSight) it tells the frame whether it is in
 *                 sight, again on each `ready` (../chatEmbed), and hands the frame's `unread`
 *                 count to the dock's arrivals. Outside a dock it posts and listens to nothing.
 *                 The frame is always sandboxed with Mini Games' attributes (DECISIONS K17: every
 *                 game sandboxes it): scripts, the site's own cookie, forms and the login popup.
 *                 `OriginChatFrame` (since v0.11.0, Cases 23) frames the website's dev server on
 *                 this PC in local development, with the same checked link on its origin; any
 *                 origin not on a loopback host renders nothing.
 * Source:         seasonal-mini-games apps/web/src/chat/ChatPanel.tsx (`HostChat`) and
 *                 useHostChatFrame.ts at 866df03; seasonal-bingo-royale
 *                 apps/web/src/shell/ChatDock.tsx (its frame) at a43209a. Built on ../chatEmbed
 *                 (reused: chatEmbedUrl, connectChat) and ./theme (useShownTheme); the origin
 *                 frame from seasonal-cases packages/ui/src/pending/OriginChatFrame.tsx at
 *                 cc75504.
 * Spec:           Seasonal Entertainment docs/EMBED.md; docs/GAME-INTEGRATION.md §5
 */
import { type ReactElement } from 'react';
export interface WebsiteChatFrameProps {
    readonly room: string;
    readonly path?: string;
    readonly className?: string;
}
export declare function WebsiteChatFrame(p: WebsiteChatFrameProps): ReactElement;
export interface OriginChatFrameProps {
    readonly origin: string;
    readonly room: string;
    readonly className?: string;
}
export declare function OriginChatFrame(p: OriginChatFrameProps): ReactElement | null;
