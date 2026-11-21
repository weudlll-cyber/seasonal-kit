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
 *                 `sandboxed` is the game's own choice (needs the owner's word): Mini Games
 *                 sandboxes its frame, Bingo does not; neither changes what a player sees today.
 * Source:         seasonal-mini-games apps/web/src/chat/ChatPanel.tsx (`HostChat`) and
 *                 useHostChatFrame.ts at 866df03; seasonal-bingo-royale
 *                 apps/web/src/shell/ChatDock.tsx (its frame) at a43209a. Built on ../chatEmbed
 *                 (reused: chatEmbedUrl, connectChat) and ./theme (useShownTheme).
 * Spec:           Seasonal Entertainment docs/EMBED.md; docs/GAME-INTEGRATION.md §5
 */
import { useContext, useEffect, useRef, type ReactElement } from 'react';

import { chatEmbedUrl, connectChat } from '../chatEmbed.js';
import { DockSight } from './dockSight.js';
import { useShownTheme } from './theme.js';

// Mini Games' sandbox: scripts, the site's own cookie, forms and the login popup.
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

export interface WebsiteChatFrameProps {
  // The game's room on the website, e.g. `mini-games` or `bingo`.
  readonly room: string;
  readonly sandboxed: boolean;
  // The game's configured embed path; the website's `/embed/chat` by default.
  readonly path?: string;
  readonly className?: string;
}

export function WebsiteChatFrame(p: WebsiteChatFrameProps): ReactElement {
  const theme = useShownTheme();
  const sight = useContext(DockSight);
  const frame = useRef<HTMLIFrameElement>(null);
  const src = chatEmbedUrl(p.room, theme, p.path);
  const visible = sight?.visible;
  const arrivals = sight?.arrivals;
  useEffect(() => {
    const element = frame.current;
    if (element === null || visible === undefined || arrivals === undefined) return undefined;
    const link = connectChat({
      frame: element,
      visible,
      onMessage: (message) => {
        if (message.type === 'unread') arrivals.frameUnread(message.count);
      },
    });
    return link.close;
  }, [src, visible, arrivals]);
  return (
    <iframe
      ref={frame}
      className={p.className ?? 'sk-chat-frame'}
      title="Chat"
      src={src}
      sandbox={p.sandboxed ? SANDBOX : undefined}
      referrerPolicy="strict-origin"
      data-testid="chat-frame"
    />
  );
}
