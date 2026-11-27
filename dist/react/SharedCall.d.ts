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
 *                 is the website's. A ./ChatDock given `onSharedCall` puts this slot in its
 *                 place (since v0.37.0); in standalone mode a game gives none.
 * Depends on:     react, ../callSlot, ../callView, ./CallFrame (the sandbox), ./theme
 * Source:         new in the kit (K77), built on ./CallSlotBox and ./CallFrame.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "The shared call" and
 *                 client/src/embed/EmbedSharedCallPage.jsx at f8f2cdf (merged 2026-11-27);
 *                 docs/concepts/shared-call.md "The games' kit".
 */
import { type ReactElement } from 'react';
export interface SharedCallSlotProps {
    readonly phone: boolean;
    readonly onCall: (callId: number | null) => void;
    readonly callPath?: string;
}
export declare function SharedCallSlot(p: SharedCallSlotProps): ReactElement;
export interface BackToCallProps {
    readonly callId: number | null;
    readonly className?: string;
}
export declare function BackToCall(p: BackToCallProps): ReactElement | null;
