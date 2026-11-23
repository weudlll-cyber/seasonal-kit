/**
 * @file   src/react/GameBar.tsx
 * @brief  The slim game bar during a round, in place of the app header (focus mode), and its
 *         line icons.
 *
 * Responsibility: one row, at most 44 px on a desktop (../../css/bar.css):
 *                 the way back to the website, if the game passes `back` (./BackLink, reused;
 *                 arrow and words on a desktop, the arrow alone on a phone with the words as its
 *                 name; since v0.12.0), the game's lead part (its season pill), its facts ("Shared"; a desktop-only
 *                 fact is read out on a phone), the time ("9:50 left"; a phone shows "9:50" and
 *                 reads " left" out), then the buttons of the panels on demand (./usePanels).
 *                 Each button has its icon and words: a desktop shows both, a phone shows the
 *                 icon and reads the words out. A button may carry an unread count, never the
 *                 only sign ("3 unread"). The full-screen toggle shows only where the browser
 *                 offers it (./useFullscreen). A toggle (the sound, since v0.11.0) switches a
 *                 setting in place, `aria-pressed` saying whether it is on. Which buttons there
 *                 are (chat, players, host, prefs since v0.12.0) is the game's: a game without a chat passes no chat
 *                 button; the chat button's unread count comes from the dock's `onUnread`
 *                 (./ChatDock, since v0.11.0). `buttonClassName`
 *                 lets a game keep its own button look (Mini Games: `smg-btn`).
 * Source:         seasonal-mini-games apps/web/src/round/FocusBar.tsx and FocusIcons.tsx at
 *                 866df03 (its season pill, mode, `barTime` and panel ids stay in the game);
 *                 Bingo has no game bar (a43209a). Built on ./usePanels, ./useFullscreen.
 * Spec:           Mini Games DECISIONS O46, O47, T141
 */
import type { ReactElement, ReactNode } from 'react';

import type { Fullscreen } from './useFullscreen.js';
import type { Panels } from './usePanels.js';
import { BackLink, type BackLinkProps } from './BackLink.js';
import { barButtonClass } from './barButtonClass.js';

// Each icon's strokes on a 24 × 24 grid: the panel icons a game names for its buttons ...
const PANEL_PATHS = {
  chat: 'M4 5h16v10H9l-4 4v-4H4z',
  players:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.4 3 5',
  host: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5',
  // Three vertical sliders with their knobs at different heights (since v0.12.0), so it is not
  // taken for `host`'s two horizontal ones.
  prefs: 'M6 4v6M6 14v6M3.5 12h5M12 4v2M12 10v10M9.5 8h5M18 4v10M18 18v2M15.5 16h5',
} as const;

// ... a toggle's, on and off (a speaker with its sound, or crossed out; since v0.11.0) ...
const TOGGLE_PATHS = {
  sound: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  'sound-off': 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6',
} as const;

// ... and the full-screen button's own two, which no panel button takes (since v0.10.0).
const PATHS = {
  ...PANEL_PATHS,
  ...TOGGLE_PATHS,
  expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  shrink: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
} as const;

// The icons a game's panel button may name (audit 2026-11-22, B4).
export type BarIconName = keyof typeof PANEL_PATHS;

// A 20 px line drawing in the text colour, hidden from screen readers: the button has words.
function BarIcon({ name }: { readonly name: keyof typeof PATHS }): ReactElement {
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

// A setting the bar switches on and off in place, e.g. the sound (since v0.11.0, Cases 36): its
// words stay the same, `aria-pressed` says whether it is on, the icon shows it too.
export interface BarToggle {
  readonly id: string;
  readonly icon: 'sound';
  readonly label: string;
  readonly on: boolean;
  readonly onToggle: () => void;
  readonly testId?: string;
}

export interface BarFact {
  readonly text: ReactNode;
  // Shown on a desktop only, read out on a phone.
  readonly desktopOnly?: boolean;
}

export interface GameBarProps<Id extends string> {
  // The way back to the website at the start of the row (since v0.12.0): arrow and words on a
  // desktop, the arrow alone on a phone. Nothing in standalone mode, nothing without the prop.
  readonly back?: BackLinkProps;
  readonly lead?: ReactNode;
  readonly facts?: readonly BarFact[];
  // The time in words, and whether " left" follows it; null before the round opens (since
  // v0.10.0 always given: null is "none", as for every other kit prop).
  readonly time: { readonly text: string; readonly left: boolean } | null;
  readonly actions: readonly BarAction<Id>[];
  // Before the panel buttons: settings switched in place (since v0.11.0).
  readonly toggles?: readonly BarToggle[];
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

function ToggleButton(p: { readonly toggle: BarToggle; readonly className: string }) {
  const { toggle } = p;
  return (
    <button
      type="button"
      className={p.className}
      aria-pressed={toggle.on}
      data-testid={toggle.testId}
      onClick={toggle.onToggle}
    >
      <BarIcon name={toggle.on ? toggle.icon : `${toggle.icon}-off`} />
      <span className="sk-bar-label">{toggle.label}</span>
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
  const className = barButtonClass(p.buttonClassName);
  return (
    <header className="sk-game-bar" data-testid="game-bar">
      {p.back === undefined ? null : <BackLink {...p.back} />}
      {p.lead}
      {(p.facts ?? []).map((fact, i) => (
        <span
          key={String(i)}
          className={fact.desktopOnly === true ? 'sk-bar-fact sk-bar-desktop' : 'sk-bar-fact'}
        >
          {fact.text}
        </span>
      ))}
      {p.time === null ? null : (
        <span className="sk-bar-fact sk-bar-time" data-testid="bar-time">
          {p.time.text}
          {/* A phone shows "9:50" and reads the word out: the bar keeps one row. */}
          {p.time.left ? <span className="sk-bar-desktop"> left</span> : null}
        </span>
      )}
      <span className="sk-bar-actions">
        {(p.toggles ?? []).map((toggle) => (
          <ToggleButton key={toggle.id} toggle={toggle} className={className} />
        ))}
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
