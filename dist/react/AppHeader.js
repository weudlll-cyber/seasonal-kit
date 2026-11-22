import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BackLink } from './BackLink.js';
import { MenuFold } from './MenuFold.js';
import { ThemeToggle } from './theme.js';
import { barButtonClass } from './barButtonClass.js';
function Nav(p) {
    return (_jsxs("nav", { className: "sk-header-nav", "aria-label": "Main", children: [p.links.map((link) => (_jsx("a", { href: link.href, "aria-current": link.active ? 'page' : undefined, children: link.label }, link.href))), p.navExtra] }));
}
function Account(p) {
    const button = barButtonClass(p.buttonClassName);
    const { account, signIn } = p;
    return (_jsxs("div", { className: "sk-header-account", "data-testid": "account", children: [account === null ? (_jsxs(_Fragment, { children: [_jsx("a", { className: button, href: signIn.signInHref, "data-testid": "sign-in", children: "Sign in" }), p.websiteMode || signIn.registerHref === undefined ? null : (_jsx("a", { className: button, href: signIn.registerHref, "data-testid": "register", children: "Register" }))] })) : (_jsxs(_Fragment, { children: [_jsxs("a", { className: "sk-header-chip", href: account.href, "data-testid": "signed-in-as", children: [_jsx("span", { className: "sk-header-chip-prefix", children: "Signed in as " }), account.name, " (", account.role, ")"] }), _jsx("button", { type: "button", className: button, "data-testid": "sign-out", onClick: account.onSignOut, children: "Sign out" })] })), p.devTools] }));
}
export function AppHeader(p) {
    return (_jsxs("header", { className: "sk-header", "data-testid": "app-header", children: [_jsx(BackLink, { websiteMode: p.websiteMode }), _jsxs("a", { className: "sk-header-brand", href: p.brand.href, children: [_jsx("span", { className: "sk-header-emblem", "aria-hidden": "true", children: p.brand.emblem }), _jsxs("span", { children: [p.brand.name, _jsx("small", { children: "Seasonal Entertainment" })] })] }), _jsxs(MenuFold, { closeKey: p.closeKey, ...(p.buttonClassName === undefined ? {} : { buttonClassName: p.buttonClassName }), children: [_jsx(Nav, { links: p.links, navExtra: p.navExtra }), _jsx(Account, { ...p })] }), _jsx(ThemeToggle, {})] }));
}
