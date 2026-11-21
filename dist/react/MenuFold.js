import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button below 960 px.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. On a
 *                 wide screen the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). Below 960 px the bar is one row
 *                 (brand, theme toggle, Menu), and the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item; Escape closes it and gives the focus back. A press
 *                 outside, or a new `closeKey` (the route, the account, the chat opening),
 *                 closes it.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import { useCallback, useEffect, useId, useRef, useState, } from 'react';
import { barButtonClass } from './barButtonClass.js';
// While open: the focus moves to the panel's first item; a press outside panel and button
// closes it.
function useOpenedPanel(open, panel, button, close) {
    useEffect(() => {
        if (!open)
            return undefined;
        panel.current?.querySelector('a[href], button, select')?.focus();
        const outside = (e) => {
            const target = e.target;
            if (panel.current?.contains(target) === true || button.current?.contains(target) === true) {
                return;
            }
            close();
        };
        document.addEventListener('pointerdown', outside);
        return () => {
            document.removeEventListener('pointerdown', outside);
        };
    }, [open, panel, button, close]);
}
export function MenuFold(p) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const button = useRef(null);
    const panel = useRef(null);
    const close = useCallback(() => {
        setOpen(false);
    }, []);
    // A new screen or another sign-in: the menu closes.
    useEffect(close, [p.closeKey, close]);
    useOpenedPanel(open, panel, button, close);
    const className = barButtonClass(p.buttonClassName, 'sk-menu-button');
    return (_jsxs(_Fragment, { children: [_jsx("button", { ref: button, type: "button", className: className, "aria-expanded": open, "aria-controls": panelId, "data-testid": "menu-button", onClick: () => {
                    setOpen(!open);
                }, children: "Menu" }), _jsx("div", { ref: panel, id: panelId, className: "sk-menu", "data-open": open, onKeyDown: (e) => {
                    if (e.key !== 'Escape' || !open)
                        return;
                    e.stopPropagation();
                    setOpen(false);
                    button.current?.focus();
                }, children: p.children })] }));
}
