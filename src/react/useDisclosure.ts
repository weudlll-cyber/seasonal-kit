/**
 * @file   src/react/useDisclosure.ts
 * @brief  React hook: a button that opens and closes a panel, closed again with Escape.
 *
 * Responsibility: the open state, the panel's id for `aria-controls`, the button's ref;
 *                 `close`, which hands the focus back to the button, where the person was before
 *                 opening; and `dismiss` (since v0.10.1), which closes and leaves the focus where
 *                 it is, for a press outside or a focus already gone elsewhere. `onKeyDown` goes
 *                 on the element around button and panel, so Escape closes from anywhere inside;
 *                 with nested menus only the innermost open one closes. `toggle`, `close` and
 *                 `dismiss` and `show` (since v0.13.0, opens and stays open) keep their identity across renders (since v0.10.0, like
 *                 ./usePanels'), so a game can list them in an effect's dependencies. The docked
 *                 chat's phone sheet (./ChatDock), the dev sign-in menu (./dev/DevSignIn) and the
 *                 header's fold (./MenuFold) use it.
 * Source:         seasonal-mini-games packages/ui/src/useDisclosure.ts at 866df03; the stable
 *                 callbacks are the kit's (audit 2026-11-22, B4).
 */
import { useCallback, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

export interface Disclosure {
  readonly open: boolean;
  readonly toggle: () => void;
  // Opens it, and leaves it open if it is (since v0.13.0).
  readonly show: () => void;
  readonly close: () => void;
  readonly dismiss: () => void;
  readonly panelId: string;
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly onKeyDown: (e: KeyboardEvent) => void;
}

export function useDisclosure(initiallyOpen = false): Disclosure {
  const [open, setOpen] = useState(initiallyOpen);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback((): void => {
    setOpen(false);
    button.current?.focus();
  }, []);
  const dismiss = useCallback((): void => {
    setOpen(false);
  }, []);
  const toggle = useCallback((): void => {
    setOpen((o) => !o);
  }, []);
  const show = useCallback((): void => {
    setOpen(true);
  }, []);
  return {
    open,
    toggle,
    show,
    close,
    dismiss,
    panelId,
    button,
    onKeyDown: (e) => {
      if (e.key !== 'Escape' || !open) return;
      // Only the innermost open menu closes.
      e.stopPropagation();
      close();
    },
  };
}
