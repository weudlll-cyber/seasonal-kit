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
export interface ResultFrameProps {
    readonly game: FitGame;
    readonly headline: ReactNode;
    readonly lines?: ReactNode;
    readonly proof?: ReactNode;
    readonly reveal?: ReactNode;
    readonly placings: ReactNode;
    readonly middle?: ReactNode;
    readonly more?: ReactNode;
    readonly layout?: 'list' | 'board';
    readonly fitted?: boolean;
    readonly fit?: FitOptions;
    readonly signature: string;
    readonly panel?: {
        readonly level: 2 | 3 | 4 | 5 | 6;
    };
}
export declare function ResultFrame(p: ResultFrameProps): ReactElement;
