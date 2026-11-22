import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useFitScale } from './useFitScale.js';
export function ResultFrame(p) {
    const fit = useFitScale(p.game, p.signature);
    return (_jsxs("section", { ref: p.fitted === true ? fit : undefined, className: "sk-result", "data-sk-layout": p.layout ?? 'list', "data-testid": "result", children: [_jsxs("div", { className: "sk-result-first", "data-sk-fit-fixed": "", "data-testid": "result-first", children: [_jsxs("header", { className: "sk-result-head", children: [_jsx("h1", { children: p.headline }), p.lines, p.proof === undefined ? null : _jsx("div", { className: "sk-result-proof", children: p.proof })] }), _jsx("div", { className: "sk-result-reveal", children: p.reveal }), _jsx("div", { className: "sk-result-places", children: p.placings })] }), p.more === undefined ? null : _jsx("div", { className: "sk-result-more", children: p.more })] }));
}
