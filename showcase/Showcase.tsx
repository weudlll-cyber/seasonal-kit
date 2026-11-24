/**
 * @file   showcase/Showcase.tsx
 * @brief  The kit's showcase: every component of `@seasonal/kit/react`, in the theme the page
 *         was opened with.
 *
 * Responsibility: one page for people and for the Playwright run (./showcase.spec.ts), built
 *                 from the kit's source, never shipped (`"files"` leaves showcase/ out). Its
 *                 sections:
 *                 - the shell: back link, theme toggle;
 *                 - the app header: signed out, website mode, dev tools (./Headers);
 *                 - the game bar: with the phase strip;
 *                 - the docked screen: the start card or the result (`?screen=result`), the
 *                   website's chat frame (a stub page here) and the call slot with a call id;
 *                 - the result frame as it stands alone, without a reveal and with a middle card
 *                   (since v0.15.0).
 *                 Everything shows what a game would pass, with sample words.
 * Source:         new in the kit.
 */
import type { ReactElement } from 'react';

import {
  BackLink,
  DockedScreen,
  GameBar,
  PhaseStrip,
  ResultFrame,
  StartCard,
  ThemeToggle,
  usePanels,
  WebsiteChatFrame,
} from '../src/react/index.js';
import { Headers } from './Headers.js';

// Four parts, one with a longer name: the strip's worst case at 320 px (it wraps, DECISIONS K29).
const PARTS = [
  { id: 'join', name: 'Join', from: 0, to: 30_000 },
  { id: 'play', name: 'Play', from: 30_000, to: 60_000 },
  { id: 'second', name: 'Second chance', from: 60_000, to: 70_000 },
  { id: 'reveal', name: 'Reveal', from: 70_000, to: 85_000 },
];

function Bar(): ReactElement {
  const panels = usePanels<'chat' | 'players' | 'host' | 'prefs'>();
  return (
    <section aria-labelledby="bar-title" className="showcase-section">
      <h2 id="bar-title">Game bar and phase strip</h2>
      <GameBar
        lead={<span className="showcase-pill">Winter</span>}
        facts={[{ text: 'Shared', desktopOnly: true }]}
        time={{ text: '9:50', left: true }}
        actions={[
          { id: 'chat', icon: 'chat', label: 'Chat', badge: 3 },
          { id: 'players', icon: 'players', label: 'Players' },
          { id: 'host', icon: 'host', label: 'Host' },
        ]}
        panels={panels}
      />
      {/* A crowded bar, as Seasonal Cases has it: a lead, two long facts and the time beside
          three buttons, more than a 320–375 px phone holds side by side (Cases 32). */}
      <div data-testid="busy-bar" style={{ minWidth: 0 }}>
        <GameBar
          lead={<span className="showcase-pill">Seasonal Cases</span>}
          facts={[{ text: '12 cases left' }, { text: '5 prizes left' }]}
          time={{ text: '9:50', left: true }}
          actions={[
            { id: 'chat', icon: 'chat', label: 'Chat', badge: 3 },
            { id: 'players', icon: 'players', label: 'Players' },
            { id: 'host', icon: 'host', label: 'Host' },
          ]}
          panels={panels}
        />
      </div>
      {/* Mini Games' bar (v0.12.0): the back link first, the Pre-picks button with `prefs`. */}
      <div data-testid="back-bar" style={{ minWidth: 0 }}>
        <GameBar
          back={{ websiteMode: true }}
          lead={<span className="showcase-pill">Winter</span>}
          time={{ text: '9:50', left: true }}
          actions={[
            { id: 'chat', icon: 'chat', label: 'Chat' },
            { id: 'players', icon: 'players', label: 'Players' },
            { id: 'host', icon: 'host', label: 'Host' },
            { id: 'prefs', icon: 'prefs', label: 'Pre-picks' },
          ]}
          panels={panels}
        />
      </div>
      <PhaseStrip
        parts={PARTS}
        at={45_000}
        label="The round's phases"
        line="You see the round 10 s late · Choices close in 0:15"
      />
    </section>
  );
}

function Result(p: { readonly fitted: boolean }): ReactElement {
  return (
    <ResultFrame
      game="mini-games"
      headline="Walter found it first — after 9 guesses"
      lines={<p>found it 0.4 s before Anna</p>}
      proof={
        <details>
          <summary>Fairness proof</summary>
          <p>The seed is revealed after the round.</p>
        </details>
      }
      reveal={<p className="showcase-reveal">The number was 42.</p>}
      placings={
        <ol aria-label="Top three">
          <li>Walter</li>
          <li>Anna</li>
          <li>Kai</li>
        </ol>
      }
      more={<p>Standings follow here.</p>}
      fitted={p.fitted}
      signature="showcase"
    />
  );
}

// Two more states of the result (since v0.15.0): no reveal (Bingo's podium), and a middle card
// (Mini Games' "Closest to winning") between the first part and "more".
function ResultStates(): ReactElement {
  return (
    <>
      <div data-testid="result-no-reveal">
        <ResultFrame
          game="bingo"
          panel={{ level: 3 }}
          headline="Final placement"
          lines={<p>You finished #2 of 8</p>}
          placings={
            <ol aria-label="Podium">
              <li>Walter</li>
              <li>Anna</li>
              <li>Kai</li>
            </ol>
          }
          more={<p>Places 4 and on follow here.</p>}
          signature="no-reveal"
        />
      </div>
      <div data-testid="result-with-middle">
        <ResultFrame
          game="mini-games"
          panel={{ level: 3 }}
          headline="Walter found it first"
          reveal={<p className="showcase-reveal">The number was 42.</p>}
          placings={<p>Walter, Anna, Kai</p>}
          middle={<p>Closest to winning: 41, 43, 40.</p>}
          more={<p>Standings follow here.</p>}
          signature="with-middle"
        />
      </div>
    </>
  );
}

function Docked(p: { readonly result: boolean }): ReactElement {
  return (
    <section aria-labelledby="docked-title" className="showcase-section showcase-docked">
      <h2 id="docked-title">Docked screen</h2>
      <div className="showcase-box">
        <DockedScreen
          // The stub's folder with its slash, so Vite's preview serves its index.html.
          chat={<WebsiteChatFrame room="mini-games" path="/embed/chat/" />}
          bar="line"
          callId={7}
        >
          {p.result ? (
            <Result fitted />
          ) : (
            <StartCard
              game="mini-games"
              season="winter"
              title="Winter"
              badge={<span className="showcase-pill">Halving round</span>}
              special={
                <>
                  <h2>Snowfall</h2>
                  <p>Every guess counts twice.</p>
                </>
              }
              facts={['Shared number between 1 and 100', 'Cooldown 3 s between guesses']}
              opensIn={4}
              signature="showcase"
            />
          )}
        </DockedScreen>
      </div>
    </section>
  );
}

export function Showcase(p: { readonly result: boolean }): ReactElement {
  return (
    <div data-sk-game="mini-games">
      <header className="showcase-head">
        <BackLink websiteMode />
        <h1>Seasonal Kit showcase</h1>
        <ThemeToggle />
      </header>
      <main>
        <Headers />
        <Bar />
        <Docked result={p.result} />
        <section aria-labelledby="result-title" className="showcase-section">
          <h2 id="result-title">Result frame</h2>
          <Result fitted={false} />
          <ResultStates />
        </section>
      </main>
    </div>
  );
}
