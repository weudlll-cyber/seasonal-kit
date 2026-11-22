/**
 * @file   src/react/usePressOutside.ts
 * @brief  React hook: while a panel is open, a press outside its boxes closes it.
 *
 * Responsibility: listens for `pointerdown` on the document only while `open`; a press whose
 *                 target is in none of `boxes` calls `outside` (a disclosure's `dismiss`, so the
 *                 focus goes where the press puts it). Pressing the button that toggles the
 *                 panel is no press outside when the button is one of the boxes, so its click
 *                 toggles once instead of closing and reopening. The header's fold
 *                 (./MenuFold) and the dev sign-in menu (./dev/DevSignIn) use it.
 * Source:         ./MenuFold's own listener since v0.9.0 (Bingo's MenuFold.tsx at a43209a),
 *                 shared since v0.10.1 (audit 2026-11-22 "Noted, not changed", B4).
 */
import { useEffect } from 'react';
// `node` is inside `box`.
export const within = (box, node) => node instanceof Node && box.current?.contains(node) === true;
export function usePressOutside(open, boxes, outside) {
    useEffect(() => {
        if (!open)
            return undefined;
        const pressed = (e) => {
            if (!boxes.some((box) => within(box, e.target)))
                outside();
        };
        document.addEventListener('pointerdown', pressed);
        return () => {
            document.removeEventListener('pointerdown', pressed);
        };
        // `boxes` is a new array each render; its refs are not, so they are the dependencies.
    }, [open, outside, ...boxes]);
}
