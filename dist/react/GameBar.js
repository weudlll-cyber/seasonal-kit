import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { barButtonClass } from './barButtonClass.js';
// Each icon's strokes on a 24 × 24 grid: the panel icons a game names for its buttons ...
const PANEL_PATHS = {
    chat: 'M4 5h16v10H9l-4 4v-4H4z',
    players: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.4 3 5',
    host: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5',
};
// ... a toggle's, on and off (a speaker with its sound, or crossed out; since v0.11.0) ...
const TOGGLE_PATHS = {
    sound: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
    'sound-off': 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6',
};
// ... and the full-screen button's own two, which no panel button takes (since v0.10.0).
const PATHS = {
    ...PANEL_PATHS,
    ...TOGGLE_PATHS,
    expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    shrink: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
};
// A 20 px line drawing in the text colour, hidden from screen readers: the button has words.
function BarIcon({ name }) {
    return (_jsx("svg", { className: "sk-bar-icon", viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", focusable: "false", children: _jsx("path", { d: PATHS[name], fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function BarButton(p) {
    const { action, panels } = p;
    const badge = action.badge ?? 0;
    return (_jsxs("button", { ref: panels.button(action.id), type: "button", className: p.className, "aria-expanded": panels.open === action.id, "data-testid": action.testId, onClick: () => {
            panels.toggle(action.id);
        }, children: [_jsx(BarIcon, { name: action.icon }), _jsx("span", { className: "sk-bar-label", children: action.label }), badge === 0 ? null : (_jsxs("span", { className: "sk-bar-badge", "data-testid": "bar-unread", children: [badge, _jsx("span", { className: "sk-visually-hidden", children: " unread" })] }))] }));
}
function ToggleButton(p) {
    const { toggle } = p;
    return (_jsxs("button", { type: "button", className: p.className, "aria-pressed": toggle.on, "data-testid": toggle.testId, onClick: toggle.onToggle, children: [_jsx(BarIcon, { name: toggle.on ? toggle.icon : `${toggle.icon}-off` }), _jsx("span", { className: "sk-bar-label", children: toggle.label })] }));
}
function FullscreenButton(p) {
    const { on, toggle } = p.fullscreen;
    return (_jsxs("button", { type: "button", className: p.className, "aria-pressed": on, "data-testid": "bar-fullscreen", onClick: toggle, children: [_jsx(BarIcon, { name: on ? 'shrink' : 'expand' }), _jsx("span", { className: "sk-bar-label", children: on ? 'Leave full screen' : 'Full screen' })] }));
}
export function GameBar(p) {
    const className = barButtonClass(p.buttonClassName);
    return (_jsxs("header", { className: "sk-game-bar", "data-testid": "game-bar", children: [p.lead, (p.facts ?? []).map((fact, i) => (_jsx("span", { className: fact.desktopOnly === true ? 'sk-bar-fact sk-bar-desktop' : 'sk-bar-fact', children: fact.text }, String(i)))), p.time === null ? null : (_jsxs("span", { className: "sk-bar-fact sk-bar-time", "data-testid": "bar-time", children: [p.time.text, p.time.left ? _jsx("span", { className: "sk-bar-desktop", children: " left" }) : null] })), _jsxs("span", { className: "sk-bar-actions", children: [(p.toggles ?? []).map((toggle) => (_jsx(ToggleButton, { toggle: toggle, className: className }, toggle.id))), p.actions.map((action) => (_jsx(BarButton, { action: action, panels: p.panels, className: className }, action.id))), p.fullscreen?.supported === true ? (_jsx(FullscreenButton, { fullscreen: p.fullscreen, className: className })) : null] })] }));
}
