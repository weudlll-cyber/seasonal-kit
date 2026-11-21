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
 * Source:         seasonal-mini-games apps/web/src/round/useFullscreen.ts at 866df03, unchanged.
 */
import { useEffect, useState } from 'react';
function supportedHere() {
    // In another page's frame the embed keeps its own rules: no full screen there.
    if (window.self !== window.top)
        return false;
    // Older engines leave `fullscreenEnabled` out entirely: that is no support either.
    return ('fullscreenEnabled' in document &&
        document.fullscreenEnabled &&
        typeof document.documentElement.requestFullscreen === 'function');
}
export function useFullscreen(target) {
    const [supported] = useState(supportedHere);
    const [on, setOn] = useState(false);
    useEffect(() => {
        if (!supported)
            return undefined;
        const follow = () => {
            setOn(target.current !== null && document.fullscreenElement === target.current);
        };
        document.addEventListener('fullscreenchange', follow);
        return () => {
            document.removeEventListener('fullscreenchange', follow);
        };
    }, [supported, target]);
    const toggle = () => {
        // A refusal (no user gesture, a policy) leaves the screen as it was.
        if (document.fullscreenElement === null)
            void target.current?.requestFullscreen().catch(() => undefined);
        else
            void document.exitFullscreen().catch(() => undefined);
    };
    return { supported, on, toggle };
}
