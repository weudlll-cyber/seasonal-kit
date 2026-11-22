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
