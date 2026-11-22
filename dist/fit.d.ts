/**
 * @file   src/fit.ts
 * @brief  Fitting a screen to the space it has: its scale `--fit`, and each game's floors.
 *
 * Responsibility: a screen (its root) names its fixed parts (`[data-sk-fit-fixed]`, else all its
 *                 children). The space they have is the nearest box that clips or scrolls, or
 *                 the root's own box (`self`). `settle` finds the largest scale ≤ 1 at which the
 *                 fixed parts fit, never below the game's scale floor. It sets it on the root as
 *                 the CSS custom property `--fit`, which the screen's sizes multiply, each with
 *                 its own readable floor (../css/fit.css), and as `data-sk-fit-scale` for tests.
 *                 Where there is room the scale is 1 and the screen looks as without it.
 *                 `watchFit` fits again when the box's size or the visual viewport changes, in
 *                 the next frame, never inside the observer's own delivery, so nothing loops.
 *                 `FIT_FLOORS` holds each game's floors. They never go below what the game has
 *                 today (DECISIONS K14), and tests/fit-floors.test.ts enforces that and keeps
 *                 ../css/fit.css equal to them.
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts at 866df03 (O111: `nextScale`,
 *                 `settle`, the measuring, the effect's watching, without React); the Bingo
 *                 floors from seasonal-bingo-royale apps/web/src/minTextSize.test.ts at a43209a.
 * Spec:           Mini Games DECISIONS O111; Bingo docs/concepts/fit-audit.md; kit DECISIONS K14
 */
export type FitGame = 'mini-games' | 'bingo';
export interface FitFloors {
    readonly scale: number;
    readonly text: number;
    readonly display: number;
    readonly row: number;
    readonly target: number;
    readonly badge: number;
}
export declare const FIT_FLOORS: Readonly<Record<FitGame, FitFloors>>;
export declare function nextScale(current: number, used: number, room: number, floor: number): number;
export declare function boxOf(root: HTMLElement): HTMLElement;
export declare function settle(root: HTMLElement, box: HTMLElement, floor: number): number;
export declare function watchFit(root: HTMLElement, game: FitGame, self?: boolean): () => void;
