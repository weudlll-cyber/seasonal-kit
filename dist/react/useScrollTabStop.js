/**
 * @file   src/react/useScrollTabStop.ts
 * @brief  React hook: a box that scrolls inside itself is a Tab stop while it scrolls.
 *
 * Responsibility: the element of the given ref gets `tabindex="0"` while its content is taller
 *                 than it (axe `scrollable-region-focusable`, WCAG 2.1.1) and none otherwise, so
 *                 a screen at rest has no extra stop. It looks again when the box's size changes
 *                 and when its content or its style does (the screen's scale, a new line).
 *                 Without a ResizeObserver (a test's DOM) it does nothing. The box names itself
 *                 and draws its focus ring.
 *                 Exported for games since v0.39.0.
 * Source:         seasonal-mini-games apps/web/src/components/scrollTabStop.ts (feat/kit-0.22),
 *                 as a hook; the style is watched too.
 */
import { useEffect } from 'react';
export function useScrollTabStop(box) {
    useEffect(() => {
        const el = box.current;
        if (el === null || typeof ResizeObserver === 'undefined')
            return undefined;
        const update = () => {
            // A pixel of rounding is no scrolling.
            if (el.scrollHeight > el.clientHeight + 1)
                el.tabIndex = 0;
            else
                el.removeAttribute('tabindex');
        };
        const sizes = new ResizeObserver(update);
        sizes.observe(el);
        const content = new MutationObserver(update);
        content.observe(el, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['style'],
        });
        update();
        return () => {
            sizes.disconnect();
            content.disconnect();
        };
    }, [box]);
}
