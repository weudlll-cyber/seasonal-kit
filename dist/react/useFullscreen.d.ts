/**
 * @file   src/react/useFullscreen.ts
 * @brief  React hook: a screen in full screen, only on the player's request.
 *
 * Responsibility: whether the browser offers the Fullscreen API here (not where it lacks it,
 *                 such as Safari on an iPhone, and never inside another page's frame), whether
 *                 the element is in full screen now (following `fullscreenchange`, so leaving
 *                 with the browser's own controls or Escape updates the toggle), and a toggle
 *                 that requests or leaves it. A refusal leaves the screen as it was. Nothing
 *                 enters full screen by itself.
 * Source:         seasonal-mini-games apps/web/src/round/useFullscreen.ts at 866df03, the behaviour
 *                 unchanged (`=== null` for its truthiness check, two comments reworded).
 */
import { type RefObject } from 'react';
export interface Fullscreen {
    readonly supported: boolean;
    readonly on: boolean;
    readonly toggle: () => void;
}
export declare function useFullscreen(target: RefObject<HTMLElement | null>): Fullscreen;
