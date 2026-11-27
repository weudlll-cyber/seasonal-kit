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
import { useCallback, useEffect } from 'react';
// Watches one box until the returned function is called.
function watch(el) {
    if (typeof ResizeObserver === 'undefined')
        return undefined;
    const update = () => {
        // A pixel of rounding is no scrolling; nor is content a box cuts or lets show.
        const scrolls = el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY);
        if (scrolls)
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
        attributeFilter: ['style', 'class'],
    });
    update();
    return () => {
        sizes.disconnect();
        content.disconnect();
    };
}
export function useScrollTabStop(box) {
    useEffect(() => {
        const el = box?.current;
        return el === null || el === undefined ? undefined : watch(el);
    }, [box]);
    // React calls what this returns when the box leaves.
    return useCallback((el) => (el === null ? undefined : watch(el)), []);
}
