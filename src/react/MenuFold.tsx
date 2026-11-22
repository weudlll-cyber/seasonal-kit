/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button below 960 px.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. On a
 *                 wide screen the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). Below 960 px the bar is one row
 *                 (brand, Menu, theme toggle), and the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item. It closes:
 *                 - on Escape, in the panel or on the button, with the focus on the button;
 *                 - when the focus leaves panel and button (Tab past the last item), so the
 *                   panel never covers what the focus moved to (WCAG 2.4.11);
 *                 - on a press outside;
 *                 - on a new `closeKey` (the route, the account): if the focus was inside the
 *                   panel, it goes to the Menu button instead of the page (WCAG 2.4.3).
 *                 Audit 2026-11-22, B7 findings 2 and 3 (DECISIONS K29). Built on
 *                 ./useDisclosure (its `close` and `dismiss`) and ./usePressOutside since
 *                 v0.10.1.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import {
  useEffect,
  useRef,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import { barButtonClass } from './barButtonClass.js';
import { useDisclosure, type Disclosure } from './useDisclosure.js';
import { usePressOutside, within } from './usePressOutside.js';

export interface MenuFoldProps {
  // Changes whenever the menu has done its job: a new route, another account.
  readonly closeKey: string;
  readonly buttonClassName?: string;
  readonly children: ReactNode;
}

// While open: the focus moves to the panel's first item; a press outside panel and button
// closes it and leaves the focus to the press (./usePressOutside).
function useOpenedPanel(menu: Disclosure, panel: RefObject<HTMLDivElement | null>): void {
  const { open, button, dismiss } = menu;
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>('a[href], button, select')?.focus();
  }, [open, panel]);
  usePressOutside(open, [panel, button], dismiss);
}

// A new route or account closes the menu; a focus left inside the hidden panel goes to the
// Menu button (`close`), not to the page's start; a focus elsewhere stays (`dismiss`).
function useCloseOnKey(
  closeKey: string,
  menu: Disclosure,
  panel: RefObject<HTMLDivElement | null>,
): void {
  const { close, dismiss } = menu;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (within(panel, document.activeElement)) close();
    else dismiss();
  }, [closeKey, panel, close, dismiss]);
}

export function MenuFold(p: MenuFoldProps): ReactElement {
  // Open state, panel id, the button's ref, Escape (focus back) and the stable callbacks:
  // ./useDisclosure, reused since v0.10.1.
  const menu = useDisclosure();
  const panel = useRef<HTMLDivElement>(null);
  useOpenedPanel(menu, panel);
  useCloseOnKey(p.closeKey, menu, panel);

  // The focus moved to an element outside panel and button: the menu closes where it is. A
  // blur to nowhere (relatedTarget null) is no such move: Safari focuses no link or button on a
  // tap, so tapping a second item blurs the first to nowhere, and a press outside is the
  // pointerdown listener's (v0.10.0 security pass, finding 1).
  const left = (e: FocusEvent): void => {
    const to = e.relatedTarget;
    if (menu.open && to !== null && !within(panel, to) && !within(menu.button, to)) {
      menu.dismiss();
    }
  };
  return (
    <>
      <button
        ref={menu.button}
        type="button"
        className={barButtonClass(p.buttonClassName, 'sk-menu-button')}
        aria-expanded={menu.open}
        aria-controls={menu.panelId}
        data-testid="menu-button"
        onClick={menu.toggle}
        onKeyDown={menu.onKeyDown}
        onBlur={left}
      >
        Menu
      </button>
      <div
        ref={panel}
        id={menu.panelId}
        className="sk-menu"
        data-sk-open={menu.open}
        onKeyDown={menu.onKeyDown}
        onBlur={left}
      >
        {p.children}
      </div>
    </>
  );
}
