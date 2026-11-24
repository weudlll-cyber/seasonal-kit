/**
 * @file   src/react/ResultFrame.tsx
 * @brief  The frame "the result": a first part one screen high, filled by the game, and what
 *         follows below.
 *
 * Responsibility: the first part holds the headline (at most two lines), the game's lines
 *                 under it (the margin, the closest miss), its proof's disclosure beside them on
 *                 a desktop, the game's reveal taking the free height, and the game's placings
 *                 (Mini Games' table, Bingo's podium) beside the reveal on a desktop and under
 *                 it on a phone. Without a reveal (null or left out, since v0.15.0) no reveal box
 *                 is rendered and the first part is one column. `middle` (since v0.15.0) is a card
 *                 of its own between the first part and `more`, fixed in the fitting like the
 *                 first part (Mini Games' "Closest to winning"). `more` follows at its own
 *                 height (standings, team result). A game whose web fonts load late passes
 *                 `fit={{ afterFonts: true }}` (v0.18.0, as StartCard's, K48) to fit again once
 *                 they have loaded; it matters where the frame is `fitted`.
 *                 Inside a docked screen (./DockedScreen) the frame fills the height above the
 *                 chat. `fitted` shrinks the first part with the screen's scale (`--fit`) where
 *                 it has not the room; off by default, so a result that does not fit scrolls as
 *                 today. A board game's reveal (`layout` board) keeps the part's full height.
 *                 `panel` (since v0.11.0, Bingo R4) makes it a panel inside a screen (a replay,
 *                 a notice, a host console): its headline a heading of the game's level instead
 *                 of the page's h1, no one-screen first part, and names broken only at their
 *                 own break points, never inside (../../css/frames.css).
 * Source:         seasonal-mini-games apps/web/src/round/ResultScreen.tsx and result.css at
 *                 866df03 (the first part's grid; its proof, placings and standings stay in the
 *                 game); seasonal-bingo-royale apps/web/src/components/Podium.tsx and results.css
 *                 at a43209a, whose podium and rows are a game's placings slot; the panel from
 *                 its FinalPlacement.tsx and podium.css at 5c613c0. Built on
 *                 ./useFitScale.
 * Spec:           Mini Games DECISIONS T145, O111; kit DECISIONS K14
 */
import type { ReactElement, ReactNode } from 'react';

import type { FitGame, FitOptions } from '../fit.js';
import { useFitScale } from './useFitScale.js';

export interface ResultFrameProps {
  readonly game: FitGame;
  readonly headline: ReactNode;
  // Lines under the headline: the margin, the closest miss.
  readonly lines?: ReactNode;
  // The proof's disclosure, beside the headline on a desktop.
  readonly proof?: ReactNode;
  // The game's reveal: the secret, a board's grid. Left out or null (since v0.15.0): no reveal
  // box is rendered, and the first part is one column (`data-sk-reveal="none"`).
  readonly reveal?: ReactNode;
  // The game's top places: a table, a podium.
  readonly placings: ReactNode;
  // Between the first part and `more`, a card of its own (since v0.15.0), e.g. Mini Games'
  // "Closest to winning". Part of the fitting like the first part.
  readonly middle?: ReactNode;
  // What follows at its own height.
  readonly more?: ReactNode;
  readonly layout?: 'list' | 'board';
  // Shrink the first part to the screen where it has not the room.
  readonly fitted?: boolean;
  // Options for the fitting, passed to useFitScale as they are (since v0.18.0, as StartCard's
  // `fit`, K48): `afterFonts` fits again once web fonts have loaded. They matter only where the
  // frame is `fitted`. Without it the frame fits as before.
  readonly fit?: FitOptions;
  // Changes when the result's content does, so it fits again.
  readonly signature: string;
  // A panel inside a screen instead of a page of its own (since v0.11.0, Bingo R4): its
  // headline a heading of the game's level, its first part as high as its content.
  readonly panel?: { readonly level: 2 | 3 | 4 | 5 | 6 };
}

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

export function ResultFrame(p: ResultFrameProps): ReactElement {
  // `self` stays false as before; only the game's options are added (T423, as StartCard).
  const fit = useFitScale<HTMLElement>(p.game, p.signature, false, p.fit);
  // A page's headline is its h1; a panel's sits at the level the game gives it.
  const Heading = p.panel === undefined ? 'h1' : HEADINGS[p.panel.level];
  // No reveal to show: its box is not rendered, so the first part has no empty column.
  const hasReveal = p.reveal !== undefined && p.reveal !== null;
  return (
    <section
      ref={p.fitted === true ? fit : undefined}
      className="sk-result"
      data-sk-layout={p.layout ?? 'list'}
      data-sk-variant={p.panel === undefined ? 'page' : 'panel'}
      data-sk-reveal={hasReveal ? undefined : 'none'}
      data-testid="result"
    >
      <div className="sk-result-first" data-sk-fit-fixed="" data-testid="result-first">
        <header className="sk-result-head">
          <Heading>{p.headline}</Heading>
          {p.lines}
          {p.proof === undefined ? null : <div className="sk-result-proof">{p.proof}</div>}
        </header>
        {hasReveal ? <div className="sk-result-reveal">{p.reveal}</div> : null}
        <div className="sk-result-places">{p.placings}</div>
      </div>
      {p.middle === undefined ? null : (
        <div className="sk-result-middle" data-sk-fit-fixed="" data-testid="result-middle">
          {p.middle}
        </div>
      )}
      {p.more === undefined ? null : <div className="sk-result-more">{p.more}</div>}
    </section>
  );
}
