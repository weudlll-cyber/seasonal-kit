import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @file   src/react/StartCard.tsx
 * @brief  The frame "before the round": one card in the round's season colour, filled by the
 *         game.
 *
 * Responsibility: the card fills its space and never scrolls the page: the head (the game's
 *                 season icon, the title in the largest type, a badge such as "Halving round"),
 *                 the game's special block, its facts as a list, and "Opens in N s" as a timer
 *                 that is not read out every second. Where the card has not the room (above a
 *                 docked chat, a small phone), every size shrinks with the screen's scale
 *                 (`--fit`, ./useFitScale) down to the game's floors (../../css/fit.css). A game
 *                 whose rounds show no season passes `season` null: no tint, no icon. The words
 *                 and icons are the game's; the frame holds only their places.
 * Source:         seasonal-mini-games apps/web/src/round/RoundIntro.tsx and roundIntro.css at
 *                 866df03 (its season names, specials and facts stay in the game). Built on
 *                 ./useFitScale.
 * Spec:           Mini Games DECISIONS O36, O93, O111; kit DECISIONS K14
 */
import { useId } from 'react';
import { useFitScale } from './useFitScale.js';
export function StartCard(p) {
    const headingId = useId();
    const fit = useFitScale(p.game, p.signature);
    const facts = p.facts ?? [];
    return (_jsxs("section", { ref: fit, className: "sk-start-card", "data-season": p.season ?? undefined, "aria-labelledby": headingId, "data-testid": "start-card", children: [_jsxs("header", { className: "sk-start-head", children: [p.season === null || p.icon === undefined ? null : (_jsx("span", { className: "sk-start-icon", "aria-hidden": "true", children: p.icon })), _jsx("h1", { id: headingId, children: p.title }), p.badge] }), p.special === undefined ? null : _jsx("div", { className: "sk-start-special", children: p.special }), facts.length === 0 ? null : (_jsx("ul", { className: "sk-start-facts", children: facts.map((fact, i) => (_jsx("li", { children: fact }, String(i)))) })), _jsxs("p", { className: "sk-start-count", role: "timer", "aria-live": "off", "data-testid": "countdown", children: ["Opens in ", _jsx("strong", { children: Math.max(0, Math.ceil(p.opensIn)) }), " s"] })] }));
}
