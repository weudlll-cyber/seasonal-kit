import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useFitScale } from './useFitScale.js';
const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' };
export function ResultFrame(p) {
    // `self` stays false as before; only the game's options are added (T423, as StartCard).
    const fit = useFitScale(p.game, p.signature, false, p.fit);
    // A page's headline is its h1; a panel's sits at the level the game gives it.
    const Heading = p.panel === undefined ? 'h1' : HEADINGS[p.panel.level];
    // No reveal to show: its box is not rendered, so the first part has no empty column.
    const hasReveal = p.reveal !== undefined && p.reveal !== null;
    return (_jsxs("section", { ref: p.fitted === true ? fit : undefined, className: "sk-result", "data-sk-layout": p.layout ?? 'list', "data-sk-variant": p.panel === undefined ? 'page' : 'panel', "data-sk-reveal": hasReveal ? undefined : 'none', "data-testid": "result", children: [_jsxs("div", { className: "sk-result-first", "data-sk-fit-fixed": "", "data-testid": "result-first", children: [_jsxs("header", { className: "sk-result-head", children: [_jsx(Heading, { children: p.headline }), p.lines, p.proof === undefined ? null : _jsx("div", { className: "sk-result-proof", children: p.proof })] }), hasReveal ? _jsx("div", { className: "sk-result-reveal", children: p.reveal }) : null, _jsx("div", { className: "sk-result-places", children: p.placings })] }), p.middle === undefined ? null : (_jsx("div", { className: "sk-result-middle", "data-sk-fit-fixed": "", "data-testid": "result-middle", children: p.middle })), p.more === undefined ? null : _jsx("div", { className: "sk-result-more", children: p.more })] }));
}
