/**
 * @file   src/react/usePanels.ts
 * @brief  React hook: the game bar's panels on demand, one open at a time.
 *
 * Responsibility: which panel is open (by the game's own ids: chat, players, host, …), or none;
 *                 each panel's opening button by id, so closing a panel hands the focus back to
 *                 the button it was opened from, as ./useDisclosure does for a single panel.
 *                 Opening another panel closes the open one. Escape and a panel's Close call
 *                 `close`.
 * Source:         seasonal-mini-games apps/web/src/round/usePanels.ts at 866df03, with the panel
 *                 ids the game's (Mini Games: 'chat' | 'players' | 'host' | 'list' | 'game').
 */
import { useCallback, useRef, useState } from 'react';
export function usePanels() {
    const [open, setOpen] = useState(null);
    // The open panel as of the last render, for the stable callbacks below.
    const current = useRef(null);
    current.current = open;
    const buttons = useRef(new Map());
    const close = useCallback(() => {
        const was = current.current;
        setOpen(null);
        if (was !== null)
            buttons.current.get(was)?.focus();
    }, []);
    const toggle = useCallback((id) => {
        if (current.current === id)
            close();
        else
            setOpen(id);
    }, [close]);
    const button = useCallback((id) => (el) => {
        if (el === null)
            buttons.current.delete(id);
        else
            buttons.current.set(id, el);
    }, []);
    return { open, toggle, close, button };
}
