/**
 * @file   src/react/StartCard.tsx
 * @brief  The frame "before the round": one card in the round's season colour, filled by the
 *         game.
 *
 * Responsibility: the card fills its space and never scrolls the page: the head (the game's
 *                 season icon, the title in the largest type, a badge such as "Halving round"),
 *                 the game's special block, its facts as a list, and "Opens in N s" as a timer
 *                 that is not read out every second. Where the card has not the room (above a
 *                 docked chat, a small phone), every size shrinks with the screen's scale
 *                 (`--fit`, ./useFitScale) down to the game's floors (../../css/fit.css). A game
 *                 whose rounds show no season passes `season` null: no tint, no icon. The words
 *                 and icons are the game's; the frame holds only their places.
 * Source:         seasonal-mini-games apps/web/src/round/RoundIntro.tsx and roundIntro.css at
 *                 866df03 (its season names, specials and facts stay in the game). Built on
 *                 ./useFitScale.
 * Spec:           Mini Games DECISIONS O36, O93, O111; kit DECISIONS K14
 */
import { useId, type ReactElement, type ReactNode } from 'react';

import type { FitGame } from '../fit.js';
import { useFitScale } from './useFitScale.js';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface StartCardProps {
  readonly game: FitGame;
  // The round's season, or null for a game whose rounds show no season.
  readonly season: Season | null;
  // The season's name, or the game's own for a seasonless game.
  readonly title: string;
  // The season's icon (decorative), the head's badge, the special's block: the game's.
  readonly icon?: ReactNode;
  readonly badge?: ReactNode;
  readonly special?: ReactNode;
  readonly facts?: readonly ReactNode[];
  // Whole seconds until the round opens.
  readonly opensIn: number;
  // Changes when the card's content does, so it fits again.
  readonly signature: string;
}

export function StartCard(p: StartCardProps): ReactElement {
  const headingId = useId();
  const fit = useFitScale<HTMLElement>(p.game, p.signature);
  const facts = p.facts ?? [];
  return (
    <section
      ref={fit}
      className="sk-start-card"
      data-sk-season={p.season ?? undefined}
      aria-labelledby={headingId}
      data-testid="start-card"
    >
      <header className="sk-start-head">
        {p.season === null || p.icon === undefined ? null : (
          <span className="sk-start-icon" aria-hidden="true">
            {p.icon}
          </span>
        )}
        <h1 id={headingId}>{p.title}</h1>
        {p.badge}
      </header>
      {p.special === undefined ? null : <div className="sk-start-special">{p.special}</div>}
      {facts.length === 0 ? null : (
        <ul className="sk-start-facts">
          {facts.map((fact, i) => (
            <li key={String(i)}>{fact}</li>
          ))}
        </ul>
      )}
      <p className="sk-start-count" role="timer" aria-live="off" data-testid="countdown">
        Opens in <strong>{Math.max(0, Math.ceil(p.opensIn))}</strong> s
      </p>
    </section>
  );
}
