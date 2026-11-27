import { jsx as _jsx } from "react/jsx-runtime";
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
import { useEffect, useRef } from 'react';
import { callEmbedUrl, connectCall } from '../callView.js';
import { useShownTheme } from './theme.js';
// The chat's sandbox (scripts, the site's own cookie, forms, popups), and popups that leave it:
// the call page must work as a page of its own (K44).
export const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
export function CallFrame(p) {
    const theme = useShownTheme();
    const frame = useRef(null);
    const { callId, onCollapsed, onEnded } = p;
    useEffect(() => {
        const element = frame.current;
        if (element === null)
            return undefined;
        const link = connectCall({
            frame: element,
            callId,
            onMessage: (message) => {
                if (message.type === 'resize')
                    onCollapsed(message.mode === 'collapsed');
                if (message.type === 'ended')
                    onEnded();
            },
        });
        return link.close;
    }, [callId, onCollapsed, onEnded]);
    return (_jsx("iframe", { ref: frame, className: "sk-call-frame", title: "Call", src: callEmbedUrl(callId, theme, p.path), sandbox: SANDBOX, allow: "autoplay; fullscreen", 
        // As the chat frame: the site learns the origin, not the path of the game's page (v0.20.0).
        referrerPolicy: "strict-origin", "data-testid": "call-frame" }));
}
