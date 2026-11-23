/**
 * @file   src/react/useDockReserve.ts
 * @brief  React hook: the height a screen keeps free at the bottom for the chat dock to come,
 *         while it has no chat yet.
 *
 * Responsibility: on the dock's desktop view (./dockSight `useDockView`) the docked chat's strip
 *                 height: `CALL_SLOT.height` (190 px), or `CALL_SLOT.lowHeight` (150 px) in a
 *                 window under `CALL_SLOT.lowBelow` (760 px) high (../callSlot, ../../css/dock.css);
 *                 on the phone view nothing (the chat bar comes in the layout). It follows the
 *                 window. A game without a chat sets it as its own bottom space, so the dock fits
 *                 later without a new layout (Cases 20). The first render reads the window, as
 *                 `useDockView` does.
 * Source:         seasonal-cases packages/ui/src/pending/useDockReserve.ts at cc75504 (BACKLOG 20).
 */
import { useEffect, useState } from 'react';

import { CALL_SLOT } from '../callSlot.js';
import { useDockView } from './dockSight.js';

// The window's height in CSS px, followed.
function useWindowHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const resized = (): void => {
      setHeight(window.innerHeight);
    };
    window.addEventListener('resize', resized);
    return () => {
      window.removeEventListener('resize', resized);
    };
  }, []);
  return height;
}

export function useDockReserve(): number {
  const view = useDockView();
  const height = useWindowHeight();
  if (view !== 'desktop') return 0;
  return height < CALL_SLOT.lowBelow ? CALL_SLOT.lowHeight : CALL_SLOT.height;
}
