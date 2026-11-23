import { jsx as _jsx } from "react/jsx-runtime";
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
import { useContext, useEffect, useRef } from 'react';
import { chatEmbedUrl, connectChat } from '../chatEmbed.js';
import { DockSight } from './dockSight.js';
import { useShownTheme } from './theme.js';
// Mini Games' sandbox: scripts, the site's own cookie, forms and the login popup.
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';
// The frame both kinds share: `src` on `origin` (this page's when left out), the checked link.
function ChatFrame(p) {
    const sight = useContext(DockSight);
    const frame = useRef(null);
    const visible = sight?.visible;
    const arrivals = sight?.arrivals;
    const { src, origin } = p;
    useEffect(() => {
        const element = frame.current;
        if (element === null || visible === undefined || arrivals === undefined)
            return undefined;
        const link = connectChat({
            frame: element,
            visible,
            onMessage: (message) => {
                if (message.type === 'unread')
                    arrivals.frameUnread(message.count);
            },
            ...(origin === undefined ? {} : { origin }),
        });
        return link.close;
    }, [src, origin, visible, arrivals]);
    return (_jsx("iframe", { ref: frame, className: p.className ?? 'sk-chat-frame', title: "Chat", src: src, sandbox: SANDBOX, referrerPolicy: "strict-origin", "data-testid": "chat-frame" }));
}
export function WebsiteChatFrame(p) {
    const theme = useShownTheme();
    return _jsx(ChatFrame, { src: chatEmbedUrl(p.room, theme, p.path), className: p.className });
}
// The loopback hosts a website's dev server runs on; no other host is ever framed this way.
const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];
// `origin` as an origin on this PC (http or https, a loopback host, nothing after it), or null.
function localOrigin(origin) {
    try {
        const url = new URL(origin);
        const plain = url.origin === origin.replace(/\/$/, '');
        const web = url.protocol === 'http:' || url.protocol === 'https:';
        return plain && web && LOOPBACK.includes(url.hostname) ? url.origin : null;
    }
    catch {
        return null;
    }
}
// The website's chat from another origin, for local development only: a game without the
// website around it frames the website's dev server's embed page. Any origin that is not on
// this PC renders nothing, so no production origin can be framed this way.
export function OriginChatFrame(p) {
    const theme = useShownTheme();
    const origin = localOrigin(p.origin);
    if (origin === null)
        return null;
    const src = new URL(chatEmbedUrl(p.room, theme), origin).href;
    return _jsx(ChatFrame, { src: src, origin: origin, className: p.className });
}
