/**
 * @file   src/react/dockSight.ts
 * @brief  What the docked chat tells the chat inside it: whether it is in sight, and where
 *         arrivals go; and which of the two layouts the viewport gets.
 *
 * Responsibility: `DockSight` is provided by ./ChatDock. The website's chat frame
 *                 (./WebsiteChatFrame) reads it to tell the frame its visibility and to hand
 *                 over the frame's unread count. A game's own chat room calls `arrived` and
 *                 `latest` through `useDockArrivals`, so the phone bar shows its newest message
 *                 and count. Outside a dock both are null, and a chat there says and counts
 *                 nothing. `useDockView` is the one choice of layout: a landscape viewport at
 *                 least 900 px wide is the desktop, anything narrower or in portrait the phone,
 *                 followed on resize and rotation.
 * Source:         seasonal-mini-games apps/web/src/chat/chatArrivals.ts (`ChatArrivals`,
 *                 `HostChatSight`) and apps/web/src/round/useRoundView.ts at 866df03; the counting
 *                 is ../chatArrivals (reused: ChatArrivals).
 */
import { createContext, useContext, useEffect, useState } from 'react';
export const DockSight = createContext(null);
export function useDockArrivals() {
    return useContext(DockSight)?.arrivals ?? null;
}
// The desktop needs both the width and a landscape viewport (Mini Games T141).
const viewOf = (width, height) => width >= 900 && width >= height ? 'desktop' : 'phone';
const current = () => viewOf(window.innerWidth, window.innerHeight);
export function useDockView() {
    const [view, setView] = useState(current);
    useEffect(() => {
        const onResize = () => {
            setView(current());
        };
        // The size may have changed between the first render and this effect.
        onResize();
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);
    return view;
}
