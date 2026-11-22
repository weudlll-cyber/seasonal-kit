/**
 * @file   src/react/useDisclosure.ts
 * @brief  React hook: a button that opens and closes a panel, closed again with Escape.
 *
 * Responsibility: the open state, the panel's id for `aria-controls`, the button's ref, and
 *                 `close`, which hands the focus back to the button, where the person was before
 *                 opening. `onKeyDown` goes on the element around button and panel, so Escape
 *                 closes from anywhere inside; with nested menus only the innermost open one
 *                 closes. `toggle` and `close` keep their identity across renders (since
 *                 v0.10.0, like ./usePanels'), so a game can list them in an effect's
 *                 dependencies. The docked chat's phone sheet (./ChatDock) and the dev sign-in
 *                 menu (./dev/DevSignIn) use it.
 * Source:         seasonal-mini-games packages/ui/src/useDisclosure.ts at 866df03; the stable
 *                 callbacks are the kit's (audit 2026-11-22, B4).
 */
import { useCallback, useId, useRef, useState } from 'react';
export function useDisclosure(initiallyOpen = false) {
    const [open, setOpen] = useState(initiallyOpen);
    const panelId = useId();
    const button = useRef(null);
    const close = useCallback(() => {
        setOpen(false);
        button.current?.focus();
    }, []);
    const toggle = useCallback(() => {
        setOpen((o) => !o);
    }, []);
    return {
        open,
        toggle,
        close,
        panelId,
        button,
        onKeyDown: (e) => {
            if (e.key !== 'Escape' || !open)
                return;
            // Only the innermost open menu closes.
            e.stopPropagation();
            close();
        },
    };
}
