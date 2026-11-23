import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button whenever they do
 *         not fit on one row.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. While
 *                 the items fit, the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). When they would take a second row
 *                 (./useHeaderFold, measured before the paint; since v0.11.0, before it below a
 *                 fixed 960 px), or the window is under the game's `foldBelow` (since v0.13.0),
 *                 the header is folded: one row (brand, Menu, theme toggle), and
 *                 the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item. It closes:
 *                 - on Escape, in the panel or on the button, with the focus on the button;
 *                 - when the focus leaves panel and button (Tab past the last item), so the
 *                   panel never covers what the focus moved to (WCAG 2.4.11);
 *                 - on a press outside;
 *                 - on a new `closeKey` (the route, the account): if the focus was inside the
 *                   panel, it goes to the Menu button instead of the page (WCAG 2.4.3).
 *                 Audit 2026-11-22, B7 findings 2 and 3 (DECISIONS K29). Built on
 *                 ./useDisclosure (its `close` and `dismiss`) and ./usePressOutside since
 *                 v0.10.1.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import { useEffect, useRef, } from 'react';
import { barButtonClass } from './barButtonClass.js';
import { useDisclosure } from './useDisclosure.js';
import { useHeaderFold } from './useHeaderFold.js';
import { usePressOutside, within } from './usePressOutside.js';
// While open: the focus moves to the panel's first item; a press outside panel and button
// closes it and leaves the focus to the press (./usePressOutside).
function useOpenedPanel(menu, panel) {
    const { open, button, dismiss } = menu;
    useEffect(() => {
        if (open)
            panel.current?.querySelector('a[href], button, select')?.focus();
    }, [open, panel]);
    usePressOutside(open, [panel, button], dismiss);
}
// A new route or account closes the menu; a focus left inside the hidden panel goes to the
// Menu button (`close`), not to the page's start; a focus elsewhere stays (`dismiss`).
function useCloseOnKey(closeKey, menu, panel) {
    const { close, dismiss } = menu;
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (within(panel, document.activeElement))
            close();
        else
            dismiss();
    }, [closeKey, panel, close, dismiss]);
}
// Folded, then unfolded again: the items are back in the bar, and an open panel has nothing
// left to show, so it closes where the focus is.
function useCloseOnUnfold(folded, menu) {
    const { open, dismiss } = menu;
    const wasFolded = useRef(folded);
    useEffect(() => {
        if (wasFolded.current && !folded && open)
            dismiss();
        wasFolded.current = folded;
    }, [folded, open, dismiss]);
}
export function MenuFold(p) {
    // Open state, panel id, the button's ref, Escape (focus back) and the stable callbacks:
    // ./useDisclosure, reused since v0.10.1.
    const menu = useDisclosure();
    const panel = useRef(null);
    useOpenedPanel(menu, panel);
    useCloseOnKey(p.closeKey, menu, panel);
    // Folded whenever the header's items do not fit on one row (./useHeaderFold, since v0.11.0).
    const folded = useHeaderFold(menu.button, p.closeKey, p.foldBelow);
    useCloseOnUnfold(folded, menu);
    // The focus moved to an element outside panel and button: the menu closes where it is. A
    // blur to nowhere (relatedTarget null) is no such move: Safari focuses no link or button on a
    // tap, so tapping a second item blurs the first to nowhere, and a press outside is the
    // pointerdown listener's (v0.10.0 security pass, finding 1).
    const left = (e) => {
        const to = e.relatedTarget;
        if (menu.open && to !== null && !within(panel, to) && !within(menu.button, to)) {
            menu.dismiss();
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { ref: menu.button, type: "button", className: barButtonClass(p.buttonClassName, 'sk-menu-button'), "aria-expanded": menu.open, "aria-controls": menu.panelId, "data-testid": "menu-button", onClick: menu.toggle, onKeyDown: menu.onKeyDown, onBlur: left, children: "Menu" }), _jsx("div", { ref: panel, id: menu.panelId, className: "sk-menu", "data-sk-open": menu.open, onKeyDown: menu.onKeyDown, onBlur: left, children: p.children })] }));
}
