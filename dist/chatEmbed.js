/**
 * @file   src/chatEmbed.ts
 * @brief  The website's chat embed inside a game, game side: its address and its typed
 *         postMessage link (`seasonal-chat` from the frame, `seasonal-chat-host` to it).
 *
 * Responsibility: `chatEmbedUrl` is the embed page on this site, `/embed/chat?room=&theme=`,
 *                 relative as the website's snippet has it for its own pages (the games are
 *                 framed only by the same site, `frame-ancestors 'self'`). `connectChat` links
 *                 the page to the chat's frame (./frameMessages: origin, window and `source`
 *                 checked, posts only at the chat's origin). It parses `ready`, `unread` and
 *                 `resize` with every field EMBED.md names, and ignores anything else. It sends
 *                 `visible` and `theme`. It tells the frame the current visibility on connect,
 *                 on every change and again on every `ready`, because a frame that loaded or
 *                 reloaded has not heard it yet (GAME-INTEGRATION §5). Nothing the page sends
 *                 is secret: only a flag and a theme name.
 * Source:         seasonal-mini-games apps/web/src/chat/useHostChatFrame.ts and ChatPanel.tsx
 *                 (`withTheme`) at 91b23bc, without React; seasonal-bingo-royale
 *                 apps/web/src/shell/ChatDock.tsx at c3b76c1 for the address (room and theme).
 * Spec:           Seasonal Entertainment docs/EMBED.md "The embed page", "The postMessage API";
 *                 docs/GAME-INTEGRATION.md §5 (at e7b995c)
 */
import { isCount, isFlag, isSize, linkFrame, } from './frameMessages.js';
import { isLocalPath } from './websiteSignIn.js';
const EMBED_PATH = '/embed/chat';
// "/embed/chat?room=mini-games&theme=dark"; `path` is the game's configured embed path.
export function chatEmbedUrl(room, theme, path = EMBED_PATH) {
    if (!isLocalPath(path))
        throw new TypeError(`Not a path on this site: ${path}`);
    return `${path}?${new URLSearchParams({ room, theme }).toString()}`;
}
const isRoom = (value) => value === null || typeof value === 'string';
export function parseChat(data) {
    const { type, room, signedIn, count, height } = data;
    if (type === 'ready' && isRoom(room) && isFlag(signedIn))
        return { type, room, signedIn };
    if (type === 'unread' && isRoom(room) && isCount(count))
        return { type, room, count };
    if (type === 'resize' && isSize(height))
        return { type, height };
    return null;
}
// Only the fields EMBED.md names for each message.
function encodeChat(message) {
    return message.type === 'visible'
        ? { type: 'visible', visible: message.visible }
        : { type: 'theme', theme: message.theme };
}
export function connectChat(options) {
    let visible = options.visible;
    const link = linkFrame({
        frame: options.frame,
        origin: options.origin ?? window.location.origin,
        source: 'seasonal-chat',
        hostSource: 'seasonal-chat-host',
        parse: parseChat,
        encode: encodeChat,
        onMessage(message) {
            if (message.type === 'ready')
                link.post({ type: 'visible', visible });
            options.onMessage(message);
        },
    });
    const post = (message) => {
        if (message.type === 'visible')
            visible = message.visible;
        link.post(message);
    };
    post({ type: 'visible', visible });
    return { post, close: link.close };
}
