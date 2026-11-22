/**
 * @file   src/react/ResultFrame.tsx
 * @brief  The frame "the result": a first part one screen high, filled by the game, and what
 *         follows below.
 *
 * Responsibility: the first part holds the headline (at most two lines), the game's lines
 *                 under it (the margin, the closest miss), its proof's disclosure beside them on
 *                 a desktop, the game's reveal taking the free height, and the game's placings
 *                 (Mini Games' table, Bingo's podium) beside the reveal on a desktop and under
 *                 it on a phone. `more` follows at its own height (standings, team result).
 *                 Inside a docked screen (./DockedScreen) the frame fills the height above the
 *                 chat. `fitted` shrinks the first part with the screen's scale (`--fit`) where
 *                 it has not the room; off by default, so a result that does not fit scrolls as
 *                 today. A board game's reveal (`layout` board) keeps the part's full height.
 * Source:         seasonal-mini-games apps/web/src/round/ResultScreen.tsx and result.css at
 *                 866df03 (the first part's grid; its proof, placings and standings stay in the
 *                 game); seasonal-bingo-royale apps/web/src/components/Podium.tsx and results.css
 *                 at a43209a, whose podium and rows are a game's placings slot. Built on
 *                 ./useFitScale.
 * Spec:           Mini Games DECISIONS T145, O111; kit DECISIONS K14
 */
import type { ReactElement, ReactNode } from 'react';

import type { FitGame } from '../fit.js';
import { useFitScale } from './useFitScale.js';

export interface ResultFrameProps {
  readonly game: FitGame;
  readonly headline: ReactNode;
  // Lines under the headline: the margin, the closest miss.
  readonly lines?: ReactNode;
  // The proof's disclosure, beside the headline on a desktop.
  readonly proof?: ReactNode;
  // The game's reveal: the secret, a board's grid.
  readonly reveal: ReactNode;
  // The game's top places: a table, a podium.
  readonly placings: ReactNode;
  // What follows the first part at its own height.
  readonly more?: ReactNode;
  readonly layout?: 'list' | 'board';
  // Shrink the first part to the screen where it has not the room.
  readonly fitted?: boolean;
  // Changes when the result's content does, so it fits again.
  readonly signature: string;
}

export function ResultFrame(p: ResultFrameProps): ReactElement {
  const fit = useFitScale<HTMLElement>(p.game, p.signature);
  return (
    <section
      ref={p.fitted === true ? fit : undefined}
      className="sk-result"
      data-sk-layout={p.layout ?? 'list'}
      data-testid="result"
    >
      <div className="sk-result-first" data-sk-fit-fixed="" data-testid="result-first">
        <header className="sk-result-head">
          <h1>{p.headline}</h1>
          {p.lines}
          {p.proof === undefined ? null : <div className="sk-result-proof">{p.proof}</div>}
        </header>
        <div className="sk-result-reveal">{p.reveal}</div>
        <div className="sk-result-places">{p.placings}</div>
      </div>
      {p.more === undefined ? null : <div className="sk-result-more">{p.more}</div>}
    </section>
  );
}
