/**
 * @file   src/react/useScrollTabStop.ts
 * @brief  React hook: a box that scrolls inside itself is a Tab stop while it scrolls.
 *
 * Responsibility: a watched element gets `tabindex="0"` while it scrolls: its content is taller
 *                 than it and its computed `overflow-y` lets it (`auto` or `scroll`; since
 *                 v0.39.1, a clipped or showing overflow is no scrolling). It has none otherwise,
 *                 so a screen at rest has no extra stop (axe `scrollable-region-focusable`,
 *                 WCAG 2.1.1). The hook looks again when the box's size changes and when its
 *                 content, style or class does (the screen's scale, a new line). The hook answers
 *                 a ref callback (since v0.40.0): put it on a box that may render later, and it
 *                 watches from the moment the box is there until it leaves. With a ref of the
 *                 caller's instead, it watches the box that ref holds when the component mounts.
 *                 Without a ResizeObserver (a test's DOM) it does nothing. The box names itself
 *                 and draws its focus ring.
 *                 Exported for games since v0.39.0.
 * Source:         seasonal-mini-games apps/web/src/components/scrollTabStop.ts (feat/kit-0.22),
 *                 as a hook; the style and the class are watched too.
 */
import { type RefCallback, type RefObject } from 'react';
export declare function useScrollTabStop(box?: RefObject<HTMLElement | null>): RefCallback<HTMLElement>;
