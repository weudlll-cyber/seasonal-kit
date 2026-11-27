/**
 * @file   src/react/StartCard.tsx
 * @brief  The frame "before the round": one card in the round's season colour, filled by the
 *         game.
 *
 * Responsibility: the card fills its space and never scrolls the page (what even the smallest
 *                 scale cannot fit scrolls inside it, a Tab stop only then, since v0.36.0): the head (the game's
 *                 season icon, the title in the largest type, a badge such as "Halving round"),
 *                 the game's special block, its facts as a list, and, when the game gives `opensIn`, "Opens in N s" as
 *                 a timer that is not read out every second (without it, no countdown). Where the card has not the room (above a
 *                 docked chat, a small phone), every size shrinks with the screen's scale
 *                 (`--fit`, ./useFitScale) down to the game's floors (../../css/fit.css). A game
 *                 whose rounds show no season passes `season` null: no tint, no icon. The words
 *                 and icons are the game's; the frame holds only their places. A game whose web
 *                 fonts load late passes `fit={{ afterFonts: true }}` (v0.16.0) to fit again
 *                 once they have loaded. With `opensAt` (v0.24.0) the card counts down itself on the
 *                 server's clock (./useCountdown).
 * Source:         seasonal-mini-games apps/web/src/round/RoundIntro.tsx and roundIntro.css at
 *                 866df03 (its season names, specials and facts stay in the game). Built on
 *                 ./useFitScale and ./useScrollTabStop.
 * Spec:           Mini Games DECISIONS O36, O93, O111; kit DECISIONS K14
 */
import { type ReactElement, type ReactNode } from 'react';
import type { FitGame, FitOptions } from '../fit.js';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export interface StartCardProps {
    readonly game: FitGame;
    readonly season: Season | null;
    readonly title: string;
    readonly icon?: ReactNode;
    readonly badge?: ReactNode;
    readonly special?: ReactNode;
    readonly facts?: readonly ReactNode[];
    readonly opensIn?: number;
    readonly opensAt?: {
        readonly at: number | null;
        readonly offsetMs: number | null;
    };
    readonly signature: string;
    readonly fit?: FitOptions;
}
export declare function StartCard(p: StartCardProps): ReactElement;
