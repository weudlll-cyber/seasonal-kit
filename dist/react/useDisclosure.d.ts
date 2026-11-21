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
import { type KeyboardEvent, type RefObject } from 'react';
export interface Disclosure {
    readonly open: boolean;
    readonly toggle: () => void;
    readonly close: () => void;
    readonly panelId: string;
    readonly button: RefObject<HTMLButtonElement | null>;
    readonly onKeyDown: (e: KeyboardEvent) => void;
}
export declare function useDisclosure(initiallyOpen?: boolean): Disclosure;
