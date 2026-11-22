/**
 * @file   src/react/dev/DevSignIn.tsx
 * @brief  Development only: the "Dev sign-in" menu, one click per test identity.
 *
 * Responsibility: one compact button that opens a menu of the game's test identities (Bingo:
 *                 host and three players; Mini Games: those and admin), each signing in with one
 *                 click through the game's `onSignIn` (its POST to the dev sign-in route). A hint
 *                 says that one window holds one sign-in. A plain disclosure (the button's
 *                 aria-expanded, buttons in a panel), not an ARIA menu: a menu would promise
 *                 arrow keys it does not have (audit 2026-11-22, B7 finding 1). Escape or a pick
 *                 closes the menu and gives the focus back to the button; a press outside closes
 *                 it and leaves the focus to the press (since v0.10.1, ../usePressOutside, as
 *                 the header's fold). A sign-in that fails (the promise rejects) is shown as an
 *                 alert naming the identity's label under the button until the next try. The
 *                 game loads this module lazily and only when its dev flag is set
 *                 (`import.meta.env.DEV`), and passes it into
 *                 ../AppHeader's `devTools` slot; its strings are in `KIT_DEV_MARKERS`
 *                 (../../devtools), which the production-bundle test looks for.
 * Source:         seasonal-bingo-royale apps/web/src/shell/DevTools.tsx (`DevSignIn`) at a43209a,
 *                 the identities and the call the game's. Built on ../useDisclosure and
 *                 ../usePressOutside.
 */
import { useRef, useState, type ReactElement } from 'react';

import { useDisclosure } from '../useDisclosure.js';
import { barButtonClass } from '../barButtonClass.js';
import { usePressOutside } from '../usePressOutside.js';

export interface DevIdentity {
  // What the game's route takes as `as`, e.g. `host`, `player-1`, `admin`.
  readonly as: string;
  readonly label: string;
}

export interface DevSignInProps {
  readonly identities: readonly DevIdentity[];
  readonly onSignIn: (as: string) => Promise<void>;
  readonly buttonClassName?: string;
}

export function DevSignIn(p: DevSignInProps): ReactElement {
  const menu = useDisclosure();
  // Button and panel: a press outside both closes the menu, as the header's fold does.
  const box = useRef<HTMLDivElement>(null);
  usePressOutside(menu.open, [box], menu.dismiss);
  // The label of the identity whose sign-in failed last, shown under the button until the next
  // try: what the menu showed, not the route's id.
  const [failed, setFailed] = useState<string | null>(null);
  const className = barButtonClass(p.buttonClassName);
  return (
    <div ref={box} className="sk-dev-menu" onKeyDown={menu.onKeyDown}>
      <button
        ref={menu.button}
        type="button"
        className={className}
        aria-expanded={menu.open}
        aria-controls={menu.panelId}
        data-testid="dev-menu"
        onClick={menu.toggle}
      >
        Dev sign-in
      </button>
      {menu.open ? (
        <div id={menu.panelId} className="sk-dev-menu-panel" data-testid="dev-menu-panel">
          {p.identities.map((d) => (
            <button
              key={d.as}
              type="button"
              className={className}
              data-testid={`dev-sign-in-${d.as}`}
              onClick={() => {
                menu.close();
                setFailed(null);
                // A failed call is shown, never left as an unhandled rejection (v0.9.0 pass, review
                // 1, finding 10).
                p.onSignIn(d.as).catch(() => {
                  setFailed(d.label);
                });
              }}
            >
              {d.label}
            </button>
          ))}
          <p className="sk-dev-menu-hint">
            One window holds one sign-in: use a private window or another browser for a second
            person.
          </p>
        </div>
      ) : null}
      {failed === null ? null : (
        <p className="sk-dev-menu-hint" role="alert">
          Dev sign-in failed: {failed}.
        </p>
      )}
    </div>
  );
}
