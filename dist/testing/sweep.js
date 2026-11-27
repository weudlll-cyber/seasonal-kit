import { probe } from './probe.js';
import { setTheme, SWEEP_SIZES } from './screens.js';
import { floorLines, uncheckedFloor } from './sweepFloors.js';
import { MOTION_LIMIT_MS, motionEnded } from './sweepMotion.js';
// What axe checks in a sweep: the WCAG 2.0 to 2.2 A and AA rules, and the two rules about
// landmarks that the docked screen is held to in the kit's own browser check (since v0.39.0).
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
export const AXE_LANDMARK_RULES = ['region', 'landmark-main-is-top-level'];
export function axeFinder(builder, options = {}) {
    return async (page) => {
        const tagged = new builder({ page }).options({
            runOnly: { type: 'tag', values: AXE_TAGS },
            rules: Object.fromEntries(AXE_LANDMARK_RULES.map((id) => [id, { enabled: true }])),
        });
        const result = await (options.exclude ?? [])
            .reduce((axe, selector) => axe.exclude(selector), tagged)
            .analyze();
        return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.map(String).join(' ')).join(', ')}`);
    };
}
// The probe's answer as report lines.
function linesOf(seen) {
    const named = (label, list) => list.map((item) => `${label}: ${item}`);
    return [
        ...(seen.hScroll ? ['the page scrolls sideways'] : []),
        ...named('outside the window', seen.outside),
        ...named('cut text', seen.cut),
        ...named('small control', seen.smallTargets),
        ...named('overlapping control', seen.overlaps),
        ...named('clipped fitted root', seen.clippedFits),
    ];
}
// An error's first line: the rest is a call log or a stack.
const firstLine = (error) => (error instanceof Error ? error.message : String(error)).split('\n')[0] ?? '';
// One screen in one look: opened afresh, so a layout that measures on load sees the real size.
async function findingsOf(page, screen, look, options) {
    await page.setViewportSize(look.size);
    const where = `${screen.name} ${String(look.size.width)}x${String(look.size.height)} ${String(look.font)}px ${look.theme}`;
    // A screen that does not open is a finding of its own; the others are still seen.
    try {
        await screen.open(page);
    }
    catch (error) {
        return [`${where}: did not open: ${firstLine(error)}`];
    }
    await page.evaluate((px) => {
        document.documentElement.style.fontSize = `${String(px)}px`;
    }, look.font);
    await setTheme(page, look.theme);
    // A pixel off the height and back: parts that measure on a resize (the fitted screens) measure
    // again with the new font.
    await page.setViewportSize({ ...look.size, height: look.size.height - 1 });
    await page.setViewportSize(look.size);
    // Two frames: resize observers have run and their layout is painted.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const moving = await motionEnded(page);
    const found = [
        ...(typeof moving === 'string'
            ? [`still moving after ${String(MOTION_LIMIT_MS / 1000)} s: ${moving}`]
            : []),
        ...linesOf(await probe(page, options.targetPx)),
        ...(await floorLines(page, screen.floors ?? [], look)),
        ...(options.axe === false ? [] : (await options.axe(page)).map((v) => `axe: ${v}`)),
    ];
    return found
        .filter((line) => !(screen.allow ?? []).some((known) => line.includes(known)))
        .map((line) => `${where}: ${line}`);
}
function looksOf(options) {
    return (options.sizes ?? SWEEP_SIZES).flatMap((size) => (options.fonts ?? [16, 32]).flatMap((font) => (options.themes ?? ['light', 'dark']).map((theme) => ({ size, font, theme }))));
}
// Every look of one screen, after its setup.
async function screenFindings(page, screen, looks, options) {
    try {
        await screen.setup?.(page);
    }
    catch (error) {
        return [`${screen.name}: its setup failed: ${firstLine(error)}`];
    }
    const findings = [];
    for (const look of looks)
        findings.push(...(await findingsOf(page, screen, look, options)));
    return findings;
}
// A floor that no look checks would pass for ever, like a sweep with nothing to see.
function refuseUnchecked(screens, looks) {
    for (const screen of screens) {
        const floor = uncheckedFloor(screen.floors ?? [], looks);
        if (floor === undefined)
            continue;
        throw new Error(`${screen.name}’s floor "${floor.selector}" (${floor.decision}) is checked at no look`);
    }
}
export async function sweep(page, screens, options) {
    const looks = looksOf(options);
    // Nothing to look at would pass every time.
    if (screens.length === 0 || looks.length === 0)
        throw new Error('the sweep has nothing to see');
    refuseUnchecked(screens, looks);
    const findings = [];
    for (const screen of screens) {
        findings.push(...(await screenFindings(page, screen, looks, options)));
    }
    if (findings.length > 0) {
        throw new Error(`the sweep found ${String(findings.length)}:\n${findings.join('\n')}`);
    }
    return screens.length * looks.length;
}
