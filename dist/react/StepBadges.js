import { jsx as _jsx } from "react/jsx-runtime";
import { isStepIcon, MAX_STEPS } from '../stepShape.js';
export function StepBadges(p) {
    const shown = (p.steps ?? [])
        .slice(0, MAX_STEPS)
        .flatMap((s) => (isStepIcon(s.icon) ? [{ key: s.ladder, name: s.name, src: s.icon }] : []));
    if (shown.length === 0)
        return null;
    return (_jsx("span", { className: ['sk-steps', p.className].filter(Boolean).join(' '), "data-testid": "steps", children: shown.map((s) => (_jsx("img", { className: ['sk-step', p.imageClassName].filter(Boolean).join(' '), src: s.src, alt: s.name }, s.key))) }));
}
