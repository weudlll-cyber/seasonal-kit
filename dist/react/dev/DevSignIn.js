import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDisclosure } from '../useDisclosure.js';
export function DevSignIn(p) {
    const menu = useDisclosure();
    const className = `sk-bar-button${p.buttonClassName === undefined ? '' : ` ${p.buttonClassName}`}`;
    return (_jsxs("div", { className: "sk-dev-menu", onKeyDown: menu.onKeyDown, children: [_jsx("button", { ref: menu.button, type: "button", className: className, "aria-expanded": menu.open, "aria-controls": menu.panelId, "data-testid": "dev-menu", onClick: menu.toggle, children: "Dev sign-in" }), menu.open ? (_jsxs("div", { id: menu.panelId, className: "sk-dev-menu-panel", role: "menu", children: [p.identities.map((d) => (_jsx("button", { type: "button", role: "menuitem", className: className, "data-testid": `dev-sign-in-${d.as}`, onClick: () => {
                            menu.close();
                            void p.onSignIn(d.as);
                        }, children: d.label }, d.as))), _jsx("p", { className: "sk-dev-menu-hint", children: "One window holds one sign-in: use a private window or another browser for a second person." })] })) : null] }));
}
