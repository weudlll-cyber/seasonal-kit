/**
 * @file   showcase/components/main.tsx
 * @brief  The base components beside the three games' current looks, for the owner's look review.
 *
 * Responsibility: the same set of controls four times: the kit's (`css/components.css`), Bingo
 *                 Royale's, Mini Games' and Seasonal Cases' (their rules copied into ./looks.css).
 *                 `?theme=light|dark` as the showcase's other pages; the header's toggle switches.
 *                 Never shipped.
 * Source:         new in the kit (K78).
 */
import '../../css/tokens.css';
import '../../css/fonts.css';
import '../../css/shell.css';
import '../../css/fit.css';
import '../../css/components.css';
import './looks.css';

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeToggle } from '../../src/react/index.js';
import { storeTheme } from '../../src/theme.js';

interface Classes {
  readonly look: string;
  readonly title: string;
  readonly button: (kind?: 'primary' | 'danger' | 'big') => string;
  readonly panel: string;
  readonly inset: string;
  readonly field: string;
  readonly input: string;
  readonly select: string;
  readonly chip: string;
  readonly live: string;
}

const prefixed = (p: string): Omit<Classes, 'look' | 'title'> => ({
  button: (kind) => `${p}-btn${kind === undefined ? '' : ` ${p}-btn--${kind}`}`,
  panel: `${p}-panel`,
  inset: `${p}-panel ${p}-panel--inset`,
  field: `${p}-field`,
  input: `${p}-input`,
  select: `${p}-select`,
  chip: `${p}-chip`,
  live: `${p}-badge-live`,
});

const LOOKS: readonly Classes[] = [
  { look: 'look-kit', title: 'Kit (proposed)', ...prefixed('sk') },
  { look: 'look-bingo', title: 'Bingo Royale today', ...prefixed('sbr') },
  { look: 'look-mini', title: 'Mini Games today', ...prefixed('smg') },
  {
    look: 'look-cases',
    title: 'Seasonal Cases today',
    // Cases styles bare inputs, one card class and a solid button; it has no chip or badge.
    button: (kind) => `button${kind === 'primary' ? ' button-solid' : ''}`,
    panel: 'card',
    inset: 'card',
    field: 'cases-field',
    input: '',
    select: '',
    chip: '',
    live: '',
  },
];

function Set(c: Classes): ReactElement {
  return (
    <section className={`components-column ${c.look}`} aria-label={c.title}>
      <h2>{c.title}</h2>
      <div className="components-row">
        <button type="button" className={c.button('primary')}>
          Primary
        </button>
        <button type="button" className={c.button()}>
          Second
        </button>
        <button type="button" className={c.button('danger')}>
          Leave
        </button>
        <button type="button" className={c.button('primary')} disabled>
          Disabled
        </button>
      </div>
      <button type="button" className={c.button('big')}>
        Start the round
      </button>
      <div className={c.panel}>
        <p>A panel on the page.</p>
        <div className={c.inset}>An inner panel.</div>
      </div>
      <label className={c.field}>
        <span>Display name</span>
        <input className={c.input} placeholder="e.g. Ana" />
      </label>
      <label className={c.field}>
        <span>Season</span>
        <select className={c.select} defaultValue="winter">
          <option value="winter">Winter</option>
          <option value="spring">Spring</option>
        </select>
      </label>
      <label className={c.field}>
        <span>Locked now</span>
        <input className={c.input} defaultValue="30 s" disabled />
      </label>
      <p className="components-row">
        <span className={c.chip}>12 players</span>
        <span className={c.live}>LIVE</span>
      </p>
    </section>
  );
}

const theme = new URLSearchParams(window.location.search).get('theme');
if (theme === 'light' || theme === 'dark') storeTheme(theme);

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <main className="components-page">
      <header className="components-row">
        <h1>Base components</h1>
        <ThemeToggle />
      </header>
      <div className="components-grid">
        {LOOKS.map((c) => (
          <Set key={c.look} {...c} />
        ))}
      </div>
    </main>,
  );
}
