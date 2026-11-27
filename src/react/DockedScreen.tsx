/**
 * @file   src/react/DockedScreen.tsx
 * @brief  A game screen with the docked chat: what the game shows now on top, the chat under it,
 *         one screen.
 *
 * Responsibility: one box, as high as its container, with the game's content (the start card,
 *                 the round, the result) on top, taking the height the chat leaves, and
 *                 ./ChatDock under it. The dock keeps its place in this box whatever is above it,
 *                 so React keeps it mounted from the round to the result and back: its room and
 *                 what was typed survive. The layout, desktop or phone, is ./dockSight
 *                 `useDockView`. On a phone the content scrolls alone above the chat bar, and the
 *                 visible viewport's height is published as `--sk-visible-height` on <html>: the
 *                 game's root (the element a screen high) takes it, so the bar stays directly
 *                 above the on-screen keyboard. With `withoutChat` (since v0.12.0) there is no
 *                 dock at all, no strip and no sheet, and the content still follows the keyboard
 *                 the same way (Mini Games T416). The box itself never takes the viewport's height:
 *                 it may sit under other parts of the page (v0.7.0, found by the showcase). The
 *                 content's box is one Tab stop, the group "Game screen", so a keyboard can
 *                 scroll it (since v0.27.0; a group, no landmark, since v0.36.0).
 * Source:         seasonal-mini-games apps/web/src/match/DockedMatch.tsx and docked.css at 866df03
 *                 (`useVisibleHeight` set the app's #root height; here a custom property the
 *                 game's root reads).
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { ChatDock, type ChatDockProps } from './ChatDock.js';
import { DockHandOver, type OpenChat } from './dockHandOver.js';
import { useDockView } from './dockSight.js';

const VISIBLE = '--sk-visible-height';

// On a phone, the visible viewport's height on <html>: when the on-screen keyboard takes part
// of it, the game's root shrinks with it.
function useVisibleHeight(phone: boolean): void {
  useEffect(() => {
    // Null or missing (undefined) in browsers and test DOMs without a visual viewport.
    const vv = window.visualViewport;
    if (!phone || vv == null) return undefined;
    const root = document.documentElement;
    const follow = (): void => {
      root.style.setProperty(VISIBLE, `${String(Math.round(vv.height))}px`);
    };
    follow();
    vv.addEventListener('resize', follow);
    return () => {
      vv.removeEventListener('resize', follow);
      root.style.removeProperty(VISIBLE);
    };
  }, [phone]);
}

// With the dock's props, or `withoutChat` alone (since v0.12.0): the screen then has no strip
// and no sheet, and still follows the on-screen keyboard. `withoutChat` unset or false is the
// docked layout as before, so no game changes until it names it.
export type DockedScreenProps = { readonly children: ReactNode } & (
  (Omit<ChatDockProps, 'phone'> & { readonly withoutChat?: false }) | { readonly withoutChat: true }
);

export function DockedScreen(p: DockedScreenProps): ReactElement {
  const view = useDockView();
  useVisibleHeight(view === 'phone');
  // The dock puts "open the chat" here; the game's bar calls it (./dockHandOver, v0.13.0).
  const openChat = useRef<OpenChat>(null);
  // Narrowed here: what is left is the dock's own props (and `withoutChat`, which it ignores).
  const dock = p.withoutChat === true ? null : <ChatDock {...p} phone={view === 'phone'} />;
  return (
    <DockHandOver.Provider value={openChat}>
      <div className="sk-docked" data-sk-view={view} data-testid="docked-screen">
        {/* It scrolls when the content is taller than the screen, so the keyboard must reach it
            (axe scrollable-region-focusable); a name needs a role, and a group is no landmark
            around the game's own `main` (axe landmark-main-is-top-level, since v0.36.0). */}
        <div className="sk-docked-main" role="group" aria-label="Game screen" tabIndex={0}>
          {p.children}
        </div>
        {dock}
      </div>
    </DockHandOver.Provider>
  );
}
