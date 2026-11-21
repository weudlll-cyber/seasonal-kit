/**
 * @file   src/react/useDisclosure.ts
 * @brief  React hook: a button that opens and closes a panel, closed again with Escape.
 *
 * Responsibility: the open state, the panel's id for `aria-controls`, the button's ref, and
 *                 `close`, which hands the focus back to the button, where the person was before
 *                 opening. `onKeyDown` goes on the element around button and panel, so Escape
 *                 closes from anywhere inside; with nested menus only the innermost open one
 *                 closes. The docked chat's phone sheet (./ChatDock) uses it.
 * Source:         seasonal-mini-games packages/ui/src/useDisclosure.ts at 866df03, the code
 *                 unchanged (one comment shortened).
 */
import { useId, useRef, useState } from 'react';
export function useDisclosure(initiallyOpen = false) {
    const [open, setOpen] = useState(initiallyOpen);
    const panelId = useId();
    const button = useRef(null);
    const close = () => {
        setOpen(false);
        button.current?.focus();
    };
    return {
        open,
        toggle: () => {
            setOpen((o) => !o);
        },
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
