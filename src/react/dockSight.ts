/**
 * @file   src/react/dockSight.ts
 * @brief  What the docked chat tells the chat inside it: whether it is in sight, and where
 *         arrivals go; and which of the two layouts the viewport gets.
 *
 * Responsibility: `DockSight` is provided by ./ChatDock. The website's chat frame
 *                 (./WebsiteChatFrame) reads it to tell the frame its visibility and to hand
 *                 over the frame's unread count. `useDockSight` is the same for a game's own
 *                 frame inside the dock: whether the sheet is open and the arrivals to pass its
 *                 unread count to (since v0.12.0). A game's own chat room calls `arrived` and
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

import type { ChatArrivals } from '../chatArrivals.js';

export interface DockSightValue {
  // Whether the chat is in sight: always on a desktop, while the sheet is open on a phone.
  readonly visible: boolean;
  readonly arrivals: ChatArrivals;
}

export const DockSight = createContext<DockSightValue | null>(null);

// What the dock tells the chat inside it, or null outside a dock (since v0.12.0): a game's own
// frame in the dock reads `visible` (the sheet is open, or a desktop) and hands its unread count
// to `arrivals`, as the website's chat frame does.
export function useDockSight(): DockSightValue | null {
  return useContext(DockSight);
}

export function useDockArrivals(): ChatArrivals | null {
  return useDockSight()?.arrivals ?? null;
}

export type DockView = 'desktop' | 'phone';

// The desktop needs both the width and a landscape viewport (Mini Games T141).
const viewOf = (width: number, height: number): DockView =>
  width >= 900 && width >= height ? 'desktop' : 'phone';

const current = (): DockView => viewOf(window.innerWidth, window.innerHeight);

export function useDockView(): DockView {
  const [view, setView] = useState(current);
  useEffect(() => {
    const onResize = (): void => {
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
