import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button below 960 px.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. On a
 *                 wide screen the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). Below 960 px the bar is one row
 *                 (brand, Menu, theme toggle), and the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item. It closes:
 *                 - on Escape, in the panel or on the button, with the focus on the button;
 *                 - when the focus leaves panel and button (Tab past the last item), so the
 *                   panel never covers what the focus moved to (WCAG 2.4.11);
 *                 - on a press outside;
 *                 - on a new `closeKey` (the route, the account): if the focus was inside the
 *                   panel, it goes to the Menu button instead of the page (WCAG 2.4.3).
 *                 Audit 2026-11-22, B7 findings 2 and 3 (DECISIONS K29).
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import { useEffect, useId, useRef, useState, } from 'react';
import { barButtonClass } from './barButtonClass.js';
const within = (box, node) => node instanceof Node && box.current?.contains(node) === true;
// While open: the focus moves to the panel's first item; a press outside panel and button
// closes it.
function useOpenedPanel(open, panel, button, setOpen) {
    useEffect(() => {
        if (!open)
            return undefined;
        panel.current?.querySelector('a[href], button, select')?.focus();
        const outside = (e) => {
            if (!within(panel, e.target) && !within(button, e.target))
                setOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        return () => {
            document.removeEventListener('pointerdown', outside);
        };
    }, [open, panel, button, setOpen]);
}
// A new route or account closes the menu; a focus left inside the hidden panel goes to the
// Menu button, not to the page's start.
function useCloseOnKey(closeKey, panel, button, setOpen) {
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const focusInside = within(panel, document.activeElement);
        setOpen(false);
        if (focusInside)
            button.current?.focus();
    }, [closeKey, panel, button, setOpen]);
}
export function MenuFold(p) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const button = useRef(null);
    const panel = useRef(null);
    useOpenedPanel(open, panel, button, setOpen);
    useCloseOnKey(p.closeKey, panel, button, setOpen);
    const escape = (e) => {
        if (e.key !== 'Escape' || !open)
            return;
        e.stopPropagation();
        setOpen(false);
        button.current?.focus();
    };
    // The focus moved to an element outside panel and button: the menu closes where it is. A
    // blur to nowhere (relatedTarget null) is no such move: Safari focuses no link or button on a
    // tap, so tapping a second item blurs the first to nowhere, and a press outside is the
    // pointerdown listener's (v0.10.0 security pass, finding 1).
    const left = (e) => {
        const to = e.relatedTarget;
        if (open && to !== null && !within(panel, to) && !within(button, to))
            setOpen(false);
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { ref: button, type: "button", className: barButtonClass(p.buttonClassName, 'sk-menu-button'), "aria-expanded": open, "aria-controls": panelId, "data-testid": "menu-button", onClick: () => {
                    setOpen(!open);
                }, onKeyDown: escape, onBlur: left, children: "Menu" }), _jsx("div", { ref: panel, id: panelId, className: "sk-menu", "data-open": open, onKeyDown: escape, onBlur: left, children: p.children })] }));
}
