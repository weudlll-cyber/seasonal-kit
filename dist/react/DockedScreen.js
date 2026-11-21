import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useState } from 'react';
import { ChatDock } from './ChatDock.js';
import { useDockView } from './dockSight.js';
// On a phone the box is the visible viewport's height: when the on-screen keyboard takes part
// of it, the box shrinks with it, so the chat bar stays directly above the keyboard.
function useVisibleHeight(box, phone) {
    useEffect(() => {
        // Null or missing (undefined) in browsers and test DOMs without a visual viewport.
        const vv = window.visualViewport;
        if (!phone || vv == null || box === null)
            return undefined;
        const follow = () => {
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
export function DockedScreen({ children, ...dock }) {
    const view = useDockView();
    // A callback ref, so the effect runs once the box exists.
    const [box, setBox] = useState(null);
    useVisibleHeight(box, view === 'phone');
    return (_jsxs("div", { ref: setBox, className: "sk-docked", "data-view": view, "data-testid": "docked-screen", children: [_jsx("div", { className: "sk-docked-main", children: children }), _jsx(ChatDock, { ...dock, phone: view === 'phone' })] }));
}
