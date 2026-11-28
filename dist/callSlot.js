/**
 * @file   src/callSlot.ts
 * @brief  The reserved call-view slot, game side: which form and size it takes, and that it is
 *         hidden while no call is linked.
 *
 * Responsibility: `callSlot` answers null, meaning hidden, with nothing reserved and nothing
 *                 loaded, until the game passes a valid call id. With one it answers the slot's
 *                 form, its `sk-` classes (../css/call.css) and its size in CSS px, with the
 *                 contract's numbers (`CALL_SLOT`):
 *                 - desktop: 338 × 190, the docked chat strip's height at 16:9, at the strip's
 *                   right end;
 *                 - desktop in a window under 760 px high: 267 × 100, the low strip (K126);
 *                   under the website's smallest picture, so its view shows one row, and the
 *                   slot has this one form there, collapsed or not;
 *                 - collapsed on a desktop: 48 × the strip's height, the audio-only column;
 *                 - phone collapsed: full width × 48, the audio strip above the chat bar;
 *                 - phone expanded: full width at 16:9.
 *                 A size of null means "from the layout": the full width, or the height that
 *                 16:9 gives it. The CSS applies the same numbers (the low window by a media
 *                 query); tests/call-css.test.ts keeps the two equal.
 * Source:         new for the kit; the numbers are the website's contract, which takes them from
 *                 seasonal-mini-games apps/web/src/match/chatDock.css at 866df03 (its strip, the
 *                 reference layout).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "Placement and sizes",
 *                 "What a game may do today" (at e7b995c)
 */
import { isCallId } from './callView.js';
export const CALL_SLOT = {
    width: 338,
    height: 190,
    lowWidth: 267,
    lowHeight: 100,
    // A window lower than this many px gets the low strip.
    lowBelow: 760,
    // The collapsed column's width on a desktop and the audio strip's height on a phone.
    bar: 48,
};
const BASE = 'sk-call-slot';
function phoneSlot(collapsed) {
    return collapsed
        ? { form: 'strip', className: `${BASE} ${BASE}--strip`, width: null, height: CALL_SLOT.bar }
        : { form: 'phone-picture', className: `${BASE} ${BASE}--phone`, width: null, height: null };
}
export function callSlot(input) {
    if (!isCallId(input.callId))
        return null;
    if (input.phone)
        return phoneSlot(input.collapsed);
    const low = input.windowHeight < CALL_SLOT.lowBelow;
    // The low strip has one form: a 48 px column would not hold the view's two buttons (K126).
    if (low) {
        return { form: 'low', className: BASE, width: CALL_SLOT.lowWidth, height: CALL_SLOT.lowHeight };
    }
    if (input.collapsed) {
        return {
            form: 'collapsed',
            className: `${BASE} ${BASE}--collapsed`,
            width: CALL_SLOT.bar,
            height: CALL_SLOT.height,
        };
    }
    return { form: 'picture', className: BASE, width: CALL_SLOT.width, height: CALL_SLOT.height };
}
