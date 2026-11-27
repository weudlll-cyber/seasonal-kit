import { wholeCount } from './probe.js';
const holds = (floor, at) => (floor.fonts ?? [16]).includes(at.font) &&
    (floor.sizes ?? [at.size]).some((s) => s.width === at.size.width && s.height === at.size.height);
// What this look shows too few of.
export async function floorLines(page, floors, at) {
    const lines = [];
    for (const floor of floors.filter((f) => holds(f, at))) {
        const seen = await wholeCount(page, floor.selector);
        if (seen < floor.least) {
            lines.push(`too few in sight: ${floor.selector}: ${String(seen)} of at least ${String(floor.least)} (${floor.decision})`);
        }
    }
    return lines;
}
// The first floor that none of these looks would check, else undefined.
export function uncheckedFloor(floors, looks) {
    return floors.find((floor) => !looks.some((at) => holds(floor, at)));
}
