/**
 * @file   src/react/CallFrame.tsx
 * @brief  The website's call view in a frame titled "Call", talking to the page through the
 *         checked `seasonal-call` link (since v0.13.0, BACKLOG 8).
 *
 * Responsibility: frames `/embed/call/<id>?theme=` (../callView `callEmbedUrl`) with the theme
 *                 the page shows (a change of theme loads it anew, as the chat's does), and
 *                 only for a valid call id: the slot (./CallSlotBox) renders it only then. The
 *                 frame allows `autoplay; fullscreen` and nothing more (no microphone, camera or
 *                 display capture: the view listens only, GAME-INTEGRATION §9). It is sandboxed
 *                 as the chat's frame is (K17), and its popups may leave the sandbox, because
 *                 "Open the call page" opens `/calls/<id>` in a new tab as an ordinary page of
 *                 the site (K44). Its `referrerPolicy` is `strict-origin`, as the chat frame's: the
 *                 site learns the origin, not the game's path (v0.20.0). `connectCall` hears the view: `ended` and a `resize` to its
 *                 other form are handed on, so the slot can follow; every other message is
 *                 heard and dropped, because the game needs nothing of it today.
 * Source:         new for the kit; built on ../callView (reused: callEmbedUrl, connectCall) and
 *                 ./theme (useShownTheme), the frame as ./WebsiteChatFrame has it.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "Framing"
 */
import { type ReactElement } from 'react';
export interface CallFrameProps {
    readonly callId: number;
    readonly path?: string;
    readonly onCollapsed: (collapsed: boolean) => void;
    readonly onEnded: () => void;
}
export declare function CallFrame(p: CallFrameProps): ReactElement;
