/**
 * @file   src/react/SeasonIcon.tsx
 * @brief  One season's icon, the website's drawing, named in English.
 *
 * Responsibility: an image of the season at the given size in CSS px, named "Spring", "Summer",
 *                 "Autumn" or "Winter". A season that is none of the four (data from elsewhere)
 *                 throws, so no empty or unnamed picture is shown. `decorative` hides it from a
 *                 screen reader where the season's name stands beside it. Needs
 *                 ../../css/seasons.css, which draws it.
 * Source:         new in the kit (K83), for the lists and badges of seasonal-bingo-royale and
 *                 seasonal-mini-games that draw the same four files.
 */
import type { ReactElement } from 'react';

import type { Season } from './StartCard.js';

const NAMES: Readonly<Record<Season, string>> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export interface SeasonIconProps {
  readonly season: Season;
  // Width and height in CSS px.
  readonly size: number;
  // The name stands beside it already: say nothing.
  readonly decorative?: boolean;
  readonly className?: string;
}

export function SeasonIcon(p: SeasonIconProps): ReactElement {
  if (!Object.hasOwn(NAMES, p.season)) throw new RangeError(`Not a season: ${p.season}`);
  return (
    <span
      className={['sk-season-icon', p.className].filter(Boolean).join(' ')}
      data-sk-season={p.season}
      style={{ width: p.size, height: p.size }}
      {...(p.decorative === true
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': NAMES[p.season] })}
    />
  );
}
