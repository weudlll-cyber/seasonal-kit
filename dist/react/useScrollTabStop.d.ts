/**
 * @file   src/react/useScrollTabStop.ts
 * @brief  React hook: a box that scrolls inside itself is a Tab stop while it scrolls.
 *
 * Responsibility: the element of the given ref gets `tabindex="0"` while it scrolls: its content
 *                 is taller than it and its computed `overflow-y` lets it (`auto` or `scroll`;
 *                 since v0.39.1, a clipped or showing overflow is no scrolling). It has none
 *                 otherwise, so a screen at rest has no extra stop (axe
 *                 `scrollable-region-focusable`, WCAG 2.1.1). It looks again when the box's size
 *                 changes and when its content, style or class does (the screen's scale, a new
 *                 line). Without a ResizeObserver (a test's DOM) it does nothing. The box names
 *                 itself and draws its focus ring.
 *                 Exported for games since v0.39.0.
 * Source:         seasonal-mini-games apps/web/src/components/scrollTabStop.ts (feat/kit-0.22),
 *                 as a hook; the style and the class are watched too.
 */
import { type RefObject } from 'react';
export declare function useScrollTabStop(box: RefObject<HTMLElement | null>): void;
