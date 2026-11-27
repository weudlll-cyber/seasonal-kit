/**
 * @file   showcase/LargeText.tsx
 * @brief  Whole screens for large text: the game bar at the window's top, the start card, a round
 *         over the docked chat and a panel with buttons (v0.36.0).
 *
 * Responsibility: each fills the window, so ./large.spec.ts measures it at a viewport's own size
 *                 and root font:
 *                 - `?screen=bar`: Seasonal Cases' organiser bar at the very top, two facts, three
 *                   buttons and three panel buttons, content under it;
 *                 - `?screen=card`: the start card over the docked chat;
 *                 - `?screen=round`: sixteen buttons over the docked chat, for the open sheet and
 *                   for the last row above the chat bar;
 *                 - `?screen=panel`: a panel with buttons holding long words, and a long headline.
 *                 Never shipped.
 * Source:         new in the kit.
 */
import type { ReactElement, ReactNode } from 'react';

import {
  DockedScreen,
  GameBar,
  ResultFrame,
  StartCard,
  usePanels,
  WebsiteChatFrame,
} from '../src/react/index.js';

function Docked(p: { readonly children: ReactNode }): ReactElement {
  return (
    <div className="showcase-screen" data-sk-game="cases">
      <div className="showcase-fill">
        <DockedScreen
          chat={<WebsiteChatFrame room="cases" path="/embed/chat/" />}
          bar="line"
          callId={null}
        >
          {p.children}
        </DockedScreen>
      </div>
    </div>
  );
}

function BarScreen(): ReactElement {
  const panels = usePanels<'players' | 'host' | 'chat'>();
  return (
    <div data-sk-game="cases">
      <GameBar
        lead={<span className="showcase-pill">Cases</span>}
        facts={[{ text: '24 cases left' }, { text: '3 prizes left' }]}
        time={{ text: '9:50', left: true }}
        toggles={[
          { id: 'sound', icon: 'sound', label: 'Sound', on: true, onToggle: () => undefined },
        ]}
        presses={[{ id: 'applaud', icon: 'applaud', label: 'Applaud', onPress: () => undefined }]}
        actions={[
          { id: 'chat', icon: 'chat', label: 'Chat' },
          { id: 'players', icon: 'players', label: 'Players' },
          { id: 'host', icon: 'host', label: 'Host' },
        ]}
        panels={panels}
      />
      <p data-testid="under-bar">The round under the bar.</p>
    </div>
  );
}

function Card(): ReactElement {
  return (
    <Docked>
      <StartCard
        game="cases"
        season="winter"
        title="Winter"
        icon={<span className="sk-season-icon" data-sk-season="winter" />}
        badge={<span className="showcase-pill">Halving round</span>}
        special={
          <>
            <h2>Snowfall</h2>
            <p>Every guess counts twice.</p>
          </>
        }
        facts={['Shared number between 1 and 100', 'Cooldown 3 s between guesses']}
        opensIn={4}
        signature="large"
      />
    </Docked>
  );
}

function Round(): ReactElement {
  return (
    <Docked>
      <div className="showcase-round">
        {Array.from({ length: 16 }, (_, i) => (
          <button key={i} type="button" className="sk-btn">
            Case {i + 1}
          </button>
        ))}
      </div>
    </Docked>
  );
}

function PanelScreen(): ReactElement {
  return (
    <main className="showcase-panel" data-sk-game="cases">
      <div className="sk-panel">
        <div className="showcase-panel-row">
          <button type="button" className="sk-btn sk-btn--primary">
            Leaderboard
          </button>
          <button type="button" className="sk-btn">
            Administration
          </button>
        </div>
      </div>
      <ResultFrame
        game="cases"
        panel={{ level: 2 }}
        headline="Maximilian found the main prize first, after nine opened cases"
        placings={<p>Walter, Ana, Kai</p>}
        signature="headline"
      />
    </main>
  );
}

export const LARGE_SCREENS: Readonly<Record<string, () => ReactElement>> = {
  bar: BarScreen,
  card: Card,
  round: Round,
  panel: PanelScreen,
};
