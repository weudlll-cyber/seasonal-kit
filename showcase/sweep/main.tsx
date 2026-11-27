/**
 * @file   showcase/sweep/main.tsx
 * @brief  The screens the testing entry's sweep is proved on (../testing.spec.ts): the kit's own
 *         parts as whole screens, and one screen broken on purpose.
 *
 * Responsibility: `?screen=header` is an app header over a page of text and buttons, `?screen=bar`
 *                 a game bar over a start card that fills the rest and fits itself, `?screen=list`
 *                 a list of forty 40 px rows in a box 200 px high (the floors' proof), and
 *                 `?screen=broken` breaks each rule of the probe once: a box wider than the window,
 *                 text cut by its box, a 20 px button, and a fitted root too small for its
 *                 content. Never shipped.
 * Source:         new in the kit (K66).
 */
import '../../css/tokens.css';
import '../../css/fonts.css';
import '../../css/motion.css';
import '../../css/shell.css';
import '../../css/fit.css';
import '../../css/frames.css';
import '../../css/bar.css';
import '../../css/header.css';
import './sweep.css';

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { AppHeader, GameBar, StartCard, usePanels } from '../../src/react/index.js';

function HeaderScreen(): ReactElement {
  return (
    <>
      <AppHeader
        websiteMode
        brand={{ href: '#/', emblem: <span />, name: 'Seasonal Cases' }}
        links={[{ href: '#/', label: 'Start', active: true }]}
        account={null}
        signIn={{ href: '#/sign-in' }}
        closeKey="sweep"
      />
      <main className="sweep-page">
        <h1>Matches</h1>
        <p>Open matches appear here when a host starts one.</p>
        <button type="button" className="sk-bar-button sweep-button">
          Refresh
        </button>
      </main>
    </>
  );
}

function BarScreen(): ReactElement {
  const panels = usePanels<'chat' | 'players'>();
  return (
    <div className="sweep-fill">
      <GameBar
        lead={<span>Winter</span>}
        time={{ text: '9:50', left: true }}
        actions={[
          { id: 'chat', icon: 'chat', label: 'Chat' },
          { id: 'players', icon: 'players', label: 'Players' },
        ]}
        panels={panels}
      />
      <StartCard
        game="mini-games"
        season="winter"
        title="Winter"
        facts={['Guess the number', '12 players']}
        opensIn={12}
        signature="sweep"
      />
    </div>
  );
}

function BrokenScreen(): ReactElement {
  return (
    <main>
      <div className="sweep-wide" data-testid="wide">
        wider than any window
      </div>
      <div className="sweep-cut" data-testid="cut">
        a sentence far too long for its own box
      </div>
      <button type="button" className="sweep-tiny" data-testid="tiny">
        x
      </button>
      <section className="sweep-clipped" data-sk-fit-scale="1" data-testid="clipped">
        <div className="sweep-tall" />
      </section>
    </main>
  );
}

function ListScreen(): ReactElement {
  return (
    <main>
      {/* A Tab stop, so a keyboard can scroll it. */}
      <div className="sweep-list" role="group" aria-label="Places" tabIndex={0}>
        <ol>
          {Array.from({ length: 40 }, (_, i) => (
            <li key={i}>Place {i + 1}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}

const SCREENS = { header: HeaderScreen, bar: BarScreen, list: ListScreen, broken: BrokenScreen };

const asked = new URLSearchParams(window.location.search).get('screen') ?? '';
const Screen = Object.hasOwn(SCREENS, asked)
  ? SCREENS[asked as keyof typeof SCREENS]
  : SCREENS.header;
const root = document.getElementById('root');
if (root !== null) createRoot(root).render(<Screen />);
