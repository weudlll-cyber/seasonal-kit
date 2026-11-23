import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BackLink(p) {
    if (!p.websiteMode)
        return null;
    return (_jsxs("a", { className: "sk-back-link", href: "/games", "data-testid": "back-link", children: [_jsx("span", { "aria-hidden": "true", children: "\u2190" }), ' ', _jsx("span", { className: "sk-back-words", children: "Seasonal Entertainment" })] }));
}
