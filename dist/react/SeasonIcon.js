import { jsx as _jsx } from "react/jsx-runtime";
const NAMES = {
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
    winter: 'Winter',
};
export function SeasonIcon(p) {
    if (!Object.hasOwn(NAMES, p.season))
        throw new RangeError(`Not a season: ${p.season}`);
    return (_jsx("span", { className: ['sk-season-icon', p.className].filter(Boolean).join(' '), "data-sk-season": p.season, style: { width: p.size, height: p.size }, ...(p.decorative === true
            ? { 'aria-hidden': true }
            : { role: 'img', 'aria-label': NAMES[p.season] }) }));
}
