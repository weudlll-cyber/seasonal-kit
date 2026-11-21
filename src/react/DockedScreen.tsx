/**
 * @file   src/react/DockedScreen.tsx
 * @brief  A game screen with the docked chat: what the game shows now on top, the chat under it,
 *         one screen.
 *
 * Responsibility: one box a screen high with the game's content (the start card, the round,
 *                 the result) on top, taking the height the chat leaves, and ./ChatDock under it.
 *                 The dock keeps its place in this box whatever is above it, so React keeps it
 *                 mounted from the round to the result and back: its room and what was typed
 *                 survive. The layout, desktop or phone, is ./dockSight `useDockView`. On a
 *                 phone the content scrolls alone above the chat bar, and the box follows the
 *                 visible viewport's height, so the bar stays above the on-screen keyboard.
 * Source:         seasonal-mini-games apps/web/src/match/DockedMatch.tsx and docked.css at 866df03
 *                 (`useVisibleHeight` moved onto this box instead of the app's #root).
 */
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { ChatDock, type ChatDockProps } from './ChatDock.js';
import { useDockView } from './dockSight.js';

// On a phone the box is the visible viewport's height: when the on-screen keyboard takes part
// of it, the box shrinks with it, so the chat bar stays directly above the keyboard.
function useVisibleHeight(box: HTMLElement | null, phone: boolean): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!phone || vv === null || box === null) return undefined;
    const follow = (): void => {
      box.style.height = `${String(Math.round(vv.height))}px`;
    };
    follow();
    vv.addEventListener('resize', follow);
    return () => {
      vv.removeEventListener('resize', follow);
      box.style.height = '';
    };
  }, [box, phone]);
}

export interface DockedScreenProps extends Omit<ChatDockProps, 'phone'> {
  readonly children: ReactNode;
}

export function DockedScreen({ children, ...dock }: DockedScreenProps): ReactElement {
  const view = useDockView();
  // A callback ref, so the effect runs once the box exists.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  useVisibleHeight(box, view === 'phone');
  return (
    <div ref={setBox} className="sk-docked" data-view={view} data-testid="docked-screen">
      <div className="sk-docked-main">{children}</div>
      <ChatDock {...dock} phone={view === 'phone'} />
    </div>
  );
}
