import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @file   src/react/SharedCall.tsx
 * @brief  The one call shared with the games: its slot, and the way back to it.
 *
 * Responsibility: `SharedCallSlot` frames the website's view of the shared call
 *                 (`/embed/call/shared`, no call number) and keeps the box hidden until the view
 *                 says a call is live (`ready` with status `live`); it hides it again when the
 *                 view says the call ended or is no longer shown, and shows it for the next one.
 *                 The frame stays loaded while hidden, so the view can learn of a share, and is
 *                 told whether it is in sight (`visible`), so a hidden view receives no picture.
 *                 The box takes the call slot's forms (../callSlot) and follows `resize`.
 *                 `onCall` gives the live call's id, or null: the game passes it to
 *                 `BackToCall`, a link to `/calls/<id>` it shows after a round's result; it keeps
 *                 the id nowhere else. There is only ever one shared call. What a member sees
 *                 inside the view (a note, not the picture, when they are in the call elsewhere)
 *                 is the website's.
 * Depends on:     react, ../callSlot, ../callView, ./CallFrame (the sandbox), ./theme
 * Source:         new in the kit (K77), built on ./CallSlotBox and ./CallFrame.
 * Spec:           Seasonal Entertainment docs/concepts/shared-call.md "The games' kit" at
 *                 cc743b9 and docs/GAME-INTEGRATION.md §9 at 963be59 (branch `feat/shared-call`,
 *                 not merged on the website yet).
 */
import { useEffect, useRef, useState } from 'react';
import { callSlot } from '../callSlot.js';
import { connectSharedCall, sharedCallEmbedUrl } from '../callView.js';
import { SANDBOX } from './CallFrame.js';
import { useShownTheme } from './theme.js';
// The link to the view: the live call it reports, and the form it asks for.
function useSharedView(onCollapsed, src) {
    const frame = useRef(null);
    const link = useRef(null);
    const [live, setLive] = useState(null);
    useEffect(() => {
        const element = frame.current;
        if (element === null)
            return undefined;
        // A new frame address (the theme) loads the view anew: it knows of no call until it says so.
        setLive(null);
        const open = connectSharedCall({
            frame: element,
            onMessage: (message) => {
                if (message.type === 'resize')
                    onCollapsed(message.mode === 'collapsed');
                if (message.type === 'ended')
                    setLive(null);
                if (message.type !== 'ready')
                    return;
                setLive(message.status === 'live' ? message.call : null);
                open.post({ type: 'visible', visible: message.status === 'live' });
            },
        });
        link.current = open;
        return open.close;
    }, [onCollapsed, src]);
    useEffect(() => {
        link.current?.post({ type: 'visible', visible: live !== null });
    }, [live]);
    return { frame, live };
}
export function SharedCallSlot(p) {
    const [collapsed, setCollapsed] = useState(p.phone);
    const src = sharedCallEmbedUrl(useShownTheme(), p.callPath);
    const { frame, live } = useSharedView(setCollapsed, src);
    const { onCall, phone } = p;
    useEffect(() => {
        setCollapsed(phone);
    }, [phone]);
    useEffect(() => {
        onCall(live);
    }, [live, onCall]);
    const slot = callSlot({ callId: live, phone, collapsed, windowHeight: window.innerHeight });
    return (_jsx("div", { className: slot?.className ?? 'sk-call-slot', hidden: slot === null, "data-sk-form": slot?.form, "data-testid": "shared-call-slot", children: _jsx("iframe", { ref: frame, className: "sk-call-frame", title: "Call", src: src, sandbox: SANDBOX, allow: "autoplay; fullscreen", referrerPolicy: "strict-origin", "data-testid": "shared-call-frame" }) }));
}
export function BackToCall(p) {
    if (p.callId === null)
        return null;
    return (_jsx("a", { className: p.className ?? 'sk-bar-button', href: `/calls/${String(p.callId)}`, "data-testid": "back-to-call", children: "Back to the call" }));
}
