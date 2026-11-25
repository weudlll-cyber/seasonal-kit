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
export interface SeasonIconProps {
    readonly season: Season;
    readonly size: number;
    readonly decorative?: boolean;
    readonly className?: string;
}
export declare function SeasonIcon(p: SeasonIconProps): ReactElement;
