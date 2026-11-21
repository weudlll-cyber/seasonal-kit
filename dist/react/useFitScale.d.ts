/**
 * @file   src/react/useFitScale.ts
 * @brief  React hook: the screen's scale `--fit` on the element the returned ref is put on.
 *
 * Responsibility: fits the screen before the first paint (a layout effect) and again when its
 *                 box's size or the visual viewport changes, by ../fit `watchFit`, with the
 *                 game's floors (`FIT_FLOORS`). A new `signature` (the screen's content changed)
 *                 fits from 1 again. `self`: the screen fills a height of its own, so its own box
 *                 is the one to fit.
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts `useFitScale` at 866df03, its
 *                 work moved to ../fit (reused: watchFit).
 */
import { type RefObject } from 'react';
import { type FitGame } from '../fit.js';
export declare function useFitScale<T extends HTMLElement>(game: FitGame, signature: string, self?: boolean): RefObject<T | null>;
