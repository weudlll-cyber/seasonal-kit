import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @file   src/react/dev/DevSignIn.tsx
 * @brief  Development only: the "Dev sign-in" menu, one click per test identity.
 *
 * Responsibility: one compact button that opens a menu of the game's test identities (Bingo:
 *                 host and three players; Mini Games: those and admin), each signing in with one
 *                 click through the game's `onSignIn` (its POST to the dev sign-in route). A hint
 *                 says that one window holds one sign-in. Escape or a pick closes the menu and
 *                 gives the focus back to the button. A sign-in that fails (the promise
 *                 rejects) is shown as an alert under the button until the next try. The game loads this module lazily and only
 *                 when its dev flag is set (`import.meta.env.DEV`), and passes it into
 *                 ../AppHeader's `devTools` slot; its strings are in `KIT_DEV_MARKERS`
 *                 (../../devtools), which the production-bundle test looks for.
 * Source:         seasonal-bingo-royale apps/web/src/shell/DevTools.tsx (`DevSignIn`) at a43209a,
 *                 the identities and the call the game's. Built on ../useDisclosure.
 */
import { useState } from 'react';
import { useDisclosure } from '../useDisclosure.js';
export function DevSignIn(p) {
    const menu = useDisclosure();
    // The identity whose sign-in failed last, shown under the button until the next try.
    const [failed, setFailed] = useState(null);
    const className = `sk-bar-button${p.buttonClassName === undefined ? '' : ` ${p.buttonClassName}`}`;
    return (_jsxs("div", { className: "sk-dev-menu", onKeyDown: menu.onKeyDown, children: [_jsx("button", { ref: menu.button, type: "button", className: className, "aria-expanded": menu.open, "aria-controls": menu.panelId, "data-testid": "dev-menu", onClick: menu.toggle, children: "Dev sign-in" }), menu.open ? (_jsxs("div", { id: menu.panelId, className: "sk-dev-menu-panel", role: "menu", children: [p.identities.map((d) => (_jsx("button", { type: "button", role: "menuitem", className: className, "data-testid": `dev-sign-in-${d.as}`, onClick: () => {
                            menu.close();
                            setFailed(null);
                            // A failed call is shown, never left as an unhandled rejection (review finding 12).
                            p.onSignIn(d.as).catch(() => {
                                setFailed(d.as);
                            });
                        }, children: d.label }, d.as))), _jsx("p", { className: "sk-dev-menu-hint", children: "One window holds one sign-in: use a private window or another browser for a second person." })] })) : null, failed === null ? null : (_jsxs("p", { className: "sk-dev-menu-hint", role: "alert", children: ["Dev sign-in as ", failed, " failed."] }))] }));
}
