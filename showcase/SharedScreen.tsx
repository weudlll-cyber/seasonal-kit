/**
 * @file   showcase/SharedScreen.tsx
 * @brief  A game screen with the shared call's slot in its dock, and the way back (K77).
 *
 * Responsibility: `?screen=shared` is a game in website mode: the docked screen gives
 *                 `onSharedCall`, and what the game shows carries `BackToCall` for the live call.
 *                 With `standalone=1` it gives none, as a game without a website does.
 *                 ./shared.spec.ts serves the frame's page. Never shipped.
 * Source:         new in the kit.
 */
import { useState, type ReactElement } from 'react';

import { BackToCall, DockedScreen, WebsiteChatFrame } from '../src/react/index.js';

export function SharedScreen(p: { readonly website: boolean }): ReactElement {
  const [call, setCall] = useState<number | null>(null);
  return (
    <div className="showcase-screen" data-sk-game="cases">
      <div className="showcase-fill">
        <DockedScreen
          chat={<WebsiteChatFrame room="cases" path="/embed/chat/" />}
          bar="line"
          callId={null}
          onSharedCall={p.website ? setCall : undefined}
        >
          <p>The round&apos;s result.</p>
          <BackToCall callId={call} />
        </DockedScreen>
      </div>
    </div>
  );
}
