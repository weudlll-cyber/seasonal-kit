/**
 * @file   src/react/SeasonIcon.tsx
 * @brief  One season's icon, the website's drawing, named in English.
 *
 * Responsibility: an image of the season at the given size (a number is CSS px; a string any
 *                 CSS length, since v0.34.0), named "Spring", "Summer", "Autumn" or "Winter";
 *                 `mono` (since v0.34.0) draws its shape in the text's own colour. A season that is none of the four (data from elsewhere)
 *                 throws, so no empty or unnamed picture is shown. `decorative` hides it from a
 *                 screen reader where the season's name stands beside it. Needs
 *                 ../../css/seasons.css, which draws it.
 * Source:         new in the kit (K83), for the lists and badges of seasonal-bingo-royale and
 *                 seasonal-mini-games that draw the same four files; the one-colour form from
 *                 seasonal-mini-games apps/web/src/season/SeasonIcon.tsx at e91cdef.
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
  // Width and height: CSS px, or any CSS length as text ("1rem", "min(2em, 40px)").
  readonly size: number | string;
  // In one colour, the text's (`currentColor`), e.g. on a season's own colour.
  readonly mono?: boolean;
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
      data-sk-mono={p.mono === true ? '' : undefined}
      style={{ width: p.size, height: p.size }}
      {...(p.decorative === true
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': NAMES[p.season] })}
    />
  );
}
