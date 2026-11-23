/**
 * @file   src/react/CallSlotBox.tsx
 * @brief  The reserved call slot of the docked chat, and the call view in it once the game's
 *         host has linked a call.
 *
 * Responsibility: the box's form and size come from ../callSlot (hidden without a valid call id,
 *                 nothing reserved and nothing loaded then). With a call id it frames the
 *                 website's call view (./CallFrame) and follows it: a phone starts in the 48 px
 *                 strip and a desktop in the picture; when the view asks for its other form
 *                 (`resize`) the box takes that form's size, and when the call ended or was
 *                 deleted the box hides and the game goes on (GAME-INTEGRATION §9). A new call
 *                 id starts over. Until v0.12.0 the box stayed empty; since v0.13.0 the frame is
 *                 in it (BACKLOG 8).
 * Source:         ./ChatDock's `CallSlotBox` (moved here, v0.13.0); the slot's rules are
 *                 ../callSlot, the frame's ./CallFrame.
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { callSlot } from '../callSlot.js';
import { CallFrame } from './CallFrame.js';

export interface CallSlotBoxProps {
  readonly callId: number | null;
  readonly phone: boolean;
  // The game's configured call embed path; the website's `/embed/call` by default.
  readonly callPath?: string;
}

export function CallSlotBox(p: CallSlotBoxProps): ReactElement {
  // The collapsed form: a phone starts in it, a desktop in the picture; the view moves it.
  const [collapsed, setCollapsed] = useState(p.phone);
  const [ended, setEnded] = useState(false);
  // Stable, so the frame's link is made once per call, not on every render.
  const end = useCallback((): void => {
    setEnded(true);
  }, []);
  useEffect(() => {
    setCollapsed(p.phone);
  }, [p.phone]);
  useEffect(() => {
    setEnded(false);
  }, [p.callId]);
  const slot = callSlot({
    callId: p.callId,
    phone: p.phone,
    collapsed,
    windowHeight: window.innerHeight,
  });
  const shown = slot !== null && !ended;
  return (
    <div
      className={slot?.className ?? 'sk-call-slot'}
      hidden={!shown}
      data-sk-form={slot?.form}
      data-testid="call-slot"
    >
      {shown && p.callId !== null ? (
        <CallFrame
          callId={p.callId}
          {...(p.callPath === undefined ? {} : { path: p.callPath })}
          onCollapsed={setCollapsed}
          onEnded={end}
        />
      ) : null}
    </div>
  );
}
