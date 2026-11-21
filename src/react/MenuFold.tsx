/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button below 960 px.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. On a
 *                 wide screen the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). Below 960 px the bar is one row
 *                 (brand, theme toggle, Menu), and the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item; Escape closes it and gives the focus back. A press
 *                 outside, or a new `closeKey` (the route, the account, the chat opening),
 *                 closes it.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

export interface MenuFoldProps {
  // Changes whenever the menu has done its job: a new route, another account.
  readonly closeKey: string;
  readonly buttonClassName?: string;
  readonly children: ReactNode;
}

// While open: the focus moves to the panel's first item; a press outside panel and button
// closes it.
function useOpenedPanel(
  open: boolean,
  panel: RefObject<HTMLDivElement | null>,
  button: RefObject<HTMLButtonElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector<HTMLElement>('a[href], button, select')?.focus();
    const outside = (e: PointerEvent): void => {
      const target = e.target as Node;
      if (panel.current?.contains(target) === true || button.current?.contains(target) === true) {
        return;
      }
      close();
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
    };
  }, [open, panel, button, close]);
}

export function MenuFold(p: MenuFoldProps): ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // A new screen or another sign-in: the menu closes.
  useEffect(close, [p.closeKey, close]);
  useOpenedPanel(open, panel, button, close);

  const className = `sk-bar-button sk-menu-button${p.buttonClassName === undefined ? '' : ` ${p.buttonClassName}`}`;
  return (
    <>
      <button
        ref={button}
        type="button"
        className={className}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="menu-button"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Menu
      </button>
      <div
        ref={panel}
        id={panelId}
        className="sk-menu"
        data-open={open}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return;
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }}
      >
        {p.children}
      </div>
    </>
  );
}
