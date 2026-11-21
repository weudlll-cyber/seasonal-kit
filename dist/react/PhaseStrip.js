import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clockText } from '../clock.js';
// How far the current part has run, as a share of it, kept inside it.
const filled = (part, at) => `${String(Math.min(100, Math.max(0, ((at - part.from) / Math.max(1, part.to - part.from)) * 100)))}%`;
function PartItem(p) {
    const { part, at } = p;
    const current = at !== null && at >= part.from && at < part.to;
    const done = at !== null && at >= part.to;
    return (_jsxs("li", { className: "sk-phase", "data-phase": part.id, "data-current": current, "data-done": done, "aria-current": current ? 'step' : undefined, style: { flexGrow: Math.max(1, part.to - part.from) }, children: [current ? (_jsx("span", { className: "sk-phase-fill", "aria-hidden": "true", style: { width: filled(part, at) } })) : null, _jsxs("span", { className: "sk-phase-name", children: [part.name, current ? _jsx("span", { className: "sk-phase-now", children: " \u00B7 now" }) : null] }), ' ', _jsxs("span", { className: "sk-phase-time", children: ["until ", clockText(part.to)] })] }));
}
export function PhaseStrip(p) {
    return (_jsxs("div", { className: "sk-phase-strip", "data-testid": "phase-strip", children: [_jsx("ol", { className: "sk-phases", "aria-label": p.label, children: p.parts.map((part) => (_jsx(PartItem, { part: part, at: p.at }, part.id))) }), p.line === undefined ? null : _jsx("p", { className: "sk-phase-line", children: p.line }), p.status === undefined ? null : (_jsx("p", { className: "sk-visually-hidden", role: "status", children: p.status }))] }));
}
