/**
 * @file   src/callView.ts
 * @brief  The website's call view inside a game, game side: its typed postMessage link
 *         (`seasonal-call` from the view, `seasonal-call-host` to it).
 *
 * Responsibility: `connectCall` links the page to the call view's frame with the chat's checks
 *                 (./frameMessages: origin, window and `source`; posts only at the view's
 *                 origin, never `'*'`). Every message type and field of GAME-INTEGRATION §9 is
 *                 checked. Anything malformed or unknown is ignored, and so is a `ready` that
 *                 names another call than the one linked. It needs a call id, so nothing links
 *                 while a game has none (./callSlot hides the slot then). It frames and loads
 *                 nothing itself: the site serves `/embed/call/<id>` (website e11b3eb), but the
 *                 kit has not yet been checked against its real messages (BACKLOG 8), so a game
 *                 frames nothing in the slot. Nothing the page sends is secret: flags and a
 *                 theme name.
 * Source:         new for the kit, built on the chat embed's link (./chatEmbed, from
 *                 seasonal-mini-games apps/web/src/chat/useHostChatFrame.ts at 91b23bc); no game
 *                 has a call view yet (Mini Games 91b23bc, Bingo c3b76c1).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "Call view inside a game"
 *                 (at e7b995c)
 */
import type { EmbedTheme } from './chatEmbed.js';
import { type Fields, type FrameLink } from './frameMessages.js';
export type CallStatus = 'scheduled' | 'live' | 'ended';
export type FromCall = {
    readonly type: 'ready';
    readonly call: number;
    readonly status: CallStatus;
    readonly signedIn: boolean;
} | {
    readonly type: 'live';
    readonly listening: boolean;
} | {
    readonly type: 'ended';
    readonly reason: 'ended' | 'gone';
} | {
    readonly type: 'speaking';
    readonly active: boolean;
} | {
    readonly type: 'resize';
    readonly mode: 'picture' | 'collapsed';
    readonly width: number;
    readonly height: number;
} | {
    readonly type: 'error';
    readonly code: string;
};
export type ToCall = {
    readonly type: 'mute';
    readonly muted: boolean;
} | {
    readonly type: 'collapse';
    readonly collapsed: boolean;
} | {
    readonly type: 'theme';
    readonly theme: EmbedTheme;
} | {
    readonly type: 'visible';
    readonly visible: boolean;
};
export declare const isCallId: (value: unknown) => value is number;
export declare function parseCall(data: Fields): FromCall | null;
export interface CallLinkOptions {
    readonly frame: HTMLIFrameElement;
    readonly callId: number;
    readonly onMessage: (message: FromCall) => void;
    readonly origin?: string;
}
export declare function connectCall(options: CallLinkOptions): FrameLink<ToCall>;
