/**
 * @file   showcase/Fixtures.tsx
 * @brief  Whole screens only a browser can judge: a docked result with a long placing list, a
 *         full header with a member's step badges, and a game's own chat in the low strip.
 *
 * Responsibility: each fills the window, so ./looks.spec.ts measures it at a viewport's own size:
 *                 - `?screen=places` (with `&dense=1` for the dense variant): the app header over
 *                   a docked screen whose result panel holds 40 ranked rows, 2 rem each, with the
 *                   chat strip under it (v0.33.0);
 *                 - `?screen=full-header`: the back link, a long brand, three links, an account
 *                   with its role, "Sign out", the toggle and three step badges (v0.33.0);
 *                 - `?screen=cases-header&role=…`: Seasonal Cases' header for a player, an
 *                   organiser or an admin (v0.36.0);
 *                 - `?screen=strip`: a game's own chat in the docked strip, the messages beside
 *                   the field, as docs/ADOPTION.md asks for the 100 px strip (K126;
 *                   ./strip.spec.ts).
 *                 Never shipped.
 * Source:         new in the kit.
 */
import type { ReactElement } from 'react';

import { AppHeader, DockedScreen, ResultFrame, WebsiteChatFrame } from '../src/react/index.js';
import { casesHeader, FULL_HEADER, PLAIN_HEADER } from './Headers.js';

const ROWS = Array.from({ length: 40 }, (_, i) => `Player ${String(i + 1)}`);

export function Places(p: { readonly dense: boolean }): ReactElement {
  return (
    <div className="showcase-screen" data-sk-game="bingo">
      <AppHeader {...PLAIN_HEADER} />
      <div className="showcase-fill">
        <DockedScreen
          chat={<WebsiteChatFrame room="bingo" path="/embed/chat/" />}
          bar="line"
          callId={null}
        >
          <ResultFrame
            game="bingo"
            panel={{ level: 2 }}
            dense={p.dense}
            headline="Final placement"
            lines={<p>You finished #12 of 40</p>}
            placings={
              <ol className="showcase-places" aria-label="Placing">
                {ROWS.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ol>
            }
            more={<p>The drawn numbers follow here.</p>}
            signature="places"
          />
        </DockedScreen>
      </div>
    </div>
  );
}

const LINES = Array.from({ length: 8 }, (_, i) => `Ada: message ${String(i + 1)}, good luck all`);

// A game's own chat: the messages, the newest at the bottom, beside the field.
function OwnChat(): ReactElement {
  return (
    <div className="showcase-strip-chat">
      <ul className="showcase-strip-lines" aria-label="Messages">
        {LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <form className="showcase-strip-form">
        <input className="sk-input" aria-label="Message" />
      </form>
    </div>
  );
}

export function LowStrip(): ReactElement {
  return (
    <div className="showcase-screen" data-sk-game="cases">
      <div className="showcase-fill">
        <DockedScreen chat={<OwnChat />} bar="line" callId={null}>
          <p>The round.</p>
        </DockedScreen>
      </div>
    </div>
  );
}

export function CasesRoleHeader(p: { readonly role: string }): ReactElement {
  return (
    <div data-sk-game="cases">
      <AppHeader {...casesHeader(p.role)} />
    </div>
  );
}

export function FullHeader(): ReactElement {
  return (
    <div data-sk-game="bingo">
      <AppHeader {...FULL_HEADER} />
    </div>
  );
}
