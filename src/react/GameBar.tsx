/**
 * @file   src/react/GameBar.tsx
 * @brief  The slim game bar during a round, in place of the app header (focus mode), and its
 *         line icons.
 *
 * Responsibility: one row, at most 44 px on a desktop and 52 px on a phone (../../css/bar.css):
 *                 the game's lead part (its season pill), its facts ("Shared"; a desktop-only
 *                 fact is read out on a phone), the time ("9:50 left"; a phone shows "9:50" and
 *                 reads " left" out), then the buttons of the panels on demand (./usePanels).
 *                 Each button has its icon and words: a desktop shows both, a phone shows the
 *                 icon and reads the words out. A button may carry an unread count, never the
 *                 only sign ("3 unread"). The full-screen toggle shows only where the browser
 *                 offers it (./useFullscreen). Which buttons there are (chat, players, host) is
 *                 the game's: a game without a chat passes no chat button. `buttonClassName`
 *                 lets a game keep its own button look (Mini Games: `smg-btn`).
 * Source:         seasonal-mini-games apps/web/src/round/FocusBar.tsx and FocusIcons.tsx at
 *                 866df03 (its season pill, mode, `barTime` and panel ids stay in the game);
 *                 Bingo has no game bar (a43209a). Built on ./usePanels, ./useFullscreen.
 * Spec:           Mini Games DECISIONS O46, O47, T141
 */
import type { ReactElement, ReactNode } from 'react';

import type { Fullscreen } from './useFullscreen.js';
import type { Panels } from './usePanels.js';

// Each icon's strokes on a 24 × 24 grid.
const PATHS = {
  chat: 'M4 5h16v10H9l-4 4v-4H4z',
  players:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.4 3 5',
  host: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5',
  expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  shrink: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
} as const;

export type BarIconName = keyof typeof PATHS;

// A 20 px line drawing in the text colour, hidden from screen readers: the button has words.
function BarIcon({ name }: { readonly name: BarIconName }): ReactElement {
  return (
    <svg
      className="sk-bar-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BarAction<Id extends string> {
  // The panel this button opens.
  readonly id: Id;
  readonly icon: BarIconName;
  readonly label: string;
  readonly testId?: string;
  // An unread count on the button's corner; nothing at 0.
  readonly badge?: number;
}

export interface BarFact {
  readonly text: ReactNode;
  // Shown on a desktop only, read out on a phone.
  readonly desktopOnly?: boolean;
}

export interface GameBarProps<Id extends string> {
  readonly lead?: ReactNode;
  readonly facts?: readonly BarFact[];
  // The time in words, and whether " left" follows it; null before the round opens.
  readonly time?: { readonly text: string; readonly left: boolean } | null;
  readonly actions: readonly BarAction<Id>[];
  readonly panels: Panels<Id>;
  readonly fullscreen?: Fullscreen;
  readonly buttonClassName?: string;
}

function BarButton<Id extends string>(p: {
  readonly action: BarAction<Id>;
  readonly panels: Panels<Id>;
  readonly className: string;
}): ReactElement {
  const { action, panels } = p;
  const badge = action.badge ?? 0;
  return (
    <button
      ref={panels.button(action.id)}
      type="button"
      className={p.className}
      aria-expanded={panels.open === action.id}
      data-testid={action.testId}
      onClick={() => {
        panels.toggle(action.id);
      }}
    >
      <BarIcon name={action.icon} />
      <span className="sk-bar-label">{action.label}</span>
      {badge === 0 ? null : (
        <span className="sk-bar-badge" data-testid="bar-unread">
          {badge}
          <span className="sk-visually-hidden"> unread</span>
        </span>
      )}
    </button>
  );
}

function FullscreenButton(p: { readonly fullscreen: Fullscreen; readonly className: string }) {
  const { on, toggle } = p.fullscreen;
  return (
    <button
      type="button"
      className={p.className}
      aria-pressed={on}
      data-testid="bar-fullscreen"
      onClick={toggle}
    >
      <BarIcon name={on ? 'shrink' : 'expand'} />
      <span className="sk-bar-label">{on ? 'Leave full screen' : 'Full screen'}</span>
    </button>
  );
}

export function GameBar<Id extends string>(p: GameBarProps<Id>): ReactElement {
  const className = `sk-bar-button${p.buttonClassName === undefined ? '' : ` ${p.buttonClassName}`}`;
  return (
    <header className="sk-game-bar" data-testid="game-bar">
      {p.lead}
      {(p.facts ?? []).map((fact, i) => (
        <span
          key={String(i)}
          className={fact.desktopOnly === true ? 'sk-bar-fact sk-bar-desktop' : 'sk-bar-fact'}
        >
          {fact.text}
        </span>
      ))}
      {p.time == null ? null : (
        <span className="sk-bar-fact" data-testid="bar-time">
          {p.time.text}
          {/* A phone shows "9:40" and reads the word out: the bar keeps one row. */}
          {p.time.left ? <span className="sk-bar-desktop"> left</span> : null}
        </span>
      )}
      <span className="sk-bar-actions">
        {p.actions.map((action) => (
          <BarButton key={action.id} action={action} panels={p.panels} className={className} />
        ))}
        {p.fullscreen?.supported === true ? (
          <FullscreenButton fullscreen={p.fullscreen} className={className} />
        ) : null}
      </span>
    </header>
  );
}
