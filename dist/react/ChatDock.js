import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @file   src/react/ChatDock.tsx
 * @brief  The docked chat: a strip under the game on a desktop, a bar with a sheet on a phone,
 *         and the reserved call slot beside or above it.
 *
 * Responsibility: on a desktop a full-width strip of fixed height (190 px, 150 px in a window
 *                 under 760 px high, ../../css/dock.css), always in sight, with the chat on the
 *                 left and the call slot at its right end at the strip's full height. On a phone
 *                 the bar at the bottom of the screen, in the layout: "Chat · <newest message>"
 *                 and the unread count, which opens the chat as a sheet above the bar. The sheet
 *                 takes the focus (since v0.10.0); Escape or Close shut it and hand the focus
 *                 back. In the bar's form `field` the game's
 *                 own writing field sits under it. The call slot is the 48 px strip directly
 *                 above the bar. The slot is hidden while no call id is set (../callSlot), and
 *                 nothing is framed in it: the site's call page does not exist yet (BACKLOG 8).
 *                 Unread counts only while the chat is out of sight (../chatArrivals); the dock
 *                 provides its arrivals to the chat inside (./dockSight). A changed count is
 *                 announced in a polite live region (role status, since v0.10.1), never on the
 *                 first render. `onUnread` hands each new count to the game, for its bar's chat
 *                 button (since v0.11.0). The same element holds
 *                 the chat in both layouts, so turning a phone does not reload it.
 * Source:         seasonal-mini-games apps/web/src/match/ChatDock.tsx and chatDock.css at 866df03
 *                 (`useArrivals`, `PhoneBar`, `Body`); Bingo's chat is a side panel instead
 *                 (apps/web/src/shell/ChatDock.tsx at a43209a). Built on ../chatArrivals
 *                 (createChatArrivals, chatBarText), ../callSlot (callSlot) and ./useDisclosure.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §5 and §9 (at e7b995c)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { callSlot } from '../callSlot.js';
import { chatBarText, createChatArrivals } from '../chatArrivals.js';
import { DockSight } from './dockSight.js';
import { useDisclosure } from './useDisclosure.js';
// The arrivals while the chat is out of sight, as React state.
function useArrivals(visible) {
    const [state, setState] = useState({ unread: 0, newest: null });
    // One counter for the dock's life; its first visibility is the dock's first.
    const [arrivals] = useState(() => createChatArrivals(visible, setState));
    useEffect(() => {
        arrivals.setVisible(visible);
    }, [arrivals, visible]);
    return { visible, arrivals, state };
}
// What the live region says about the unread count: nothing at first, then each new count
// once it changes ("2 unread chat messages"), and nothing again once all is read. The badge
// alone is never re-read by a screen reader (audit 2026-11-22 "Noted", B7 info; v0.10.1).
function useUnreadAnnouncement(unread) {
    const [said, setSaid] = useState('');
    const last = useRef(unread);
    useEffect(() => {
        if (unread === last.current)
            return;
        last.current = unread;
        const plural = unread === 1 ? '' : 's';
        setSaid(unread === 0 ? '' : `${String(unread)} unread chat message${plural}`);
    }, [unread]);
    return said;
}
function PhoneBar(p) {
    const newest = chatBarText(p.state.newest);
    return (_jsxs(_Fragment, { children: [_jsxs("button", { ref: p.sheet.button, type: "button", className: "sk-chat-bar", "aria-expanded": p.sheet.open, "aria-controls": p.sheet.panelId, "data-testid": "chat-bar", onClick: p.sheet.toggle, children: [_jsxs("span", { className: "sk-chat-bar-newest", children: [_jsx("strong", { children: "Chat" }), newest === null ? null : _jsxs("span", { className: "sk-chat-bar-last", children: [" \u00B7 ", newest] })] }), p.state.unread === 0 ? null : (_jsxs("span", { className: "sk-chat-bar-badge", "data-testid": "chat-unread", children: [p.state.unread, _jsx("span", { className: "sk-visually-hidden", children: " unread" })] }))] }), p.field] }));
}
function Body(p) {
    // The phone's sheet takes the focus when it opens; Close and Escape give it back to the chat
    // bar (../useDisclosure). WCAG 2.4.3, audit 2026-11-22 B7 finding 6 (DECISIONS K29). Only the
    // opening itself moves it, never a resize into the phone layout with the sheet already open
    // (v0.10.0 security pass, finding 4).
    const closeButton = useRef(null);
    const wasOpen = useRef(p.sheet.open);
    useEffect(() => {
        if (p.phone && p.sheet.open && !wasOpen.current)
            closeButton.current?.focus();
        wasOpen.current = p.sheet.open;
    }, [p.phone, p.sheet.open]);
    return (_jsxs("div", { id: p.sheet.panelId, className: "sk-chat-dock-body", role: p.phone ? 'dialog' : undefined, "aria-label": p.phone ? 'Chat' : undefined, hidden: p.phone && !p.sheet.open, children: [p.phone ? (_jsxs("header", { className: "sk-chat-dock-head", children: [_jsx("h2", { children: "Chat" }), _jsx("button", { ref: closeButton, type: "button", className: "sk-chat-dock-close", onClick: p.sheet.close, children: "Close" })] })) : null, p.children] }));
}
// The reserved call slot: its form from ../callSlot, hidden without a call id.
function CallSlotBox(p) {
    const slot = callSlot({
        callId: p.callId,
        phone: p.phone,
        collapsed: p.phone,
        windowHeight: window.innerHeight,
    });
    return (_jsx("div", { className: slot?.className ?? 'sk-call-slot', hidden: slot === null, "data-sk-form": slot?.form, "data-testid": "call-slot" }));
}
export function ChatDock(p) {
    const sheet = useDisclosure();
    const sight = useArrivals(!p.phone || sheet.open);
    const announced = useUnreadAnnouncement(sight.state.unread);
    const { onUnread } = p;
    const unread = sight.state.unread;
    useEffect(() => {
        onUnread?.(unread);
    }, [onUnread, unread]);
    const value = useMemo(() => ({ visible: sight.visible, arrivals: sight.arrivals }), [sight.visible, sight.arrivals]);
    return (_jsx(DockSight.Provider, { value: value, children: _jsxs("section", { className: "sk-chat-dock", "aria-label": "Chat", "data-sk-view": p.phone ? 'phone' : 'desktop', "data-sk-bar": p.bar, "data-sk-open": sheet.open, "data-testid": "chat-dock", onKeyDown: sheet.onKeyDown, children: [_jsx("p", { className: "sk-visually-hidden", role: "status", "aria-live": "polite", "data-testid": "chat-announce", children: announced }), p.phone ? _jsx(CallSlotBox, { callId: p.callId, phone: true }) : null, _jsxs("div", { className: "sk-chat-dock-row", children: [p.phone ? (_jsx(PhoneBar, { sheet: sheet, state: sight.state, field: p.bar === 'field' ? (p.field ?? null) : null })) : null, _jsx(Body, { sheet: sheet, phone: p.phone, children: p.chat }), p.phone ? null : _jsx(CallSlotBox, { callId: p.callId, phone: false })] })] }) }));
}
