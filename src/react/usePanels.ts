/**
 * @file   src/react/usePanels.ts
 * @brief  React hook: the game bar's panels on demand, one open at a time.
 *
 * Responsibility: which panel is open (by the game's own ids: chat, players, host, …), or none;
 *                 each panel's opening button by id, so closing a panel hands the focus back to
 *                 the button it was opened from, as ./useDisclosure does for a single panel.
 *                 Opening another panel closes the open one. Escape and a panel's Close call
 *                 `close`.
 * Source:         seasonal-mini-games apps/web/src/round/usePanels.ts at 866df03, with the panel
 *                 ids the game's (Mini Games: 'chat' | 'players' | 'host' | 'list' | 'game').
 */
import { useCallback, useRef, useState } from 'react';

export interface Panels<Id extends string = string> {
  readonly open: Id | null;
  readonly toggle: (id: Id) => void;
  readonly close: () => void;
  // The ref callback of a panel's opening button.
  readonly button: (id: Id) => (el: HTMLButtonElement | null) => void;
}

export function usePanels<Id extends string = string>(): Panels<Id> {
  const [open, setOpen] = useState<Id | null>(null);
  // The open panel as of the last render, for the stable callbacks below.
  const current = useRef<Id | null>(null);
  current.current = open;
  const buttons = useRef(new Map<Id, HTMLButtonElement>());
  const close = useCallback((): void => {
    const was = current.current;
    setOpen(null);
    if (was !== null) buttons.current.get(was)?.focus();
  }, []);
  const toggle = useCallback(
    (id: Id): void => {
      if (current.current === id) close();
      else setOpen(id);
    },
    [close],
  );
  const button = useCallback(
    (id: Id) =>
      (el: HTMLButtonElement | null): void => {
        if (el === null) buttons.current.delete(id);
        else buttons.current.set(id, el);
      },
    [],
  );
  return { open, toggle, close, button };
}
