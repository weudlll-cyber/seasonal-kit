/**
 * @file   src/react/useFocusMode.ts
 * @brief  React hook: the focus mode, the game's own bar in place of the app header, while the
 *         screen that calls it is shown.
 *
 * Responsibility: sets `data-sk-focus` on <html> while mounted and active, and removes it
 *                 again, so the game's stylesheet hides its own header with one rule
 *                 (`html[data-sk-focus] .shell-bar { display: none; }`) and gives the screen the
 *                 whole width. The kit does not know a game's header, so it never hides one
 *                 itself. A count keeps the mark while any screen in focus mode is shown.
 * Source:         seasonal-mini-games apps/web/src/round/focus.css (`#root:has(.focus-mode)
 *                 .shell-bar`) at 866df03: the same effect, set by the screen instead of found
 *                 by `:has()`. Bingo keeps its header during a round (a43209a).
 * Spec:           Mini Games DECISIONS O46
 */
import { useEffect } from 'react';
const ATTR = 'data-sk-focus';
// The screens in focus mode now, so one unmounting leaves the mark for another.
let screens = 0;
export function useFocusMode(active = true) {
    useEffect(() => {
        if (!active)
            return undefined;
        screens += 1;
        document.documentElement.setAttribute(ATTR, '');
        return () => {
            screens -= 1;
            if (screens === 0)
                document.documentElement.removeAttribute(ATTR);
        };
    }, [active]);
}
