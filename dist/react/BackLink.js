import { jsx as _jsx } from "react/jsx-runtime";
export function BackLink(p) {
    if (!p.websiteMode)
        return null;
    return (_jsx("a", { className: "sk-back-link", href: "/games", "data-testid": "back-link", children: "\u2190 Seasonal Entertainment" }));
}
