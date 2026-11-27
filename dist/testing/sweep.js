import { probe } from './probe.js';
import { setTheme, SWEEP_SIZES } from './screens.js';
export function axeFinder(builder, options = {}) {
    return async (page) => {
        const tagged = new builder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
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
// How long an animation may still run before the screen is judged as it is.
const MOTION_LIMIT_MS = 5000;
// Waits until every animation and transition that ends has ended, so a part is not judged half
// faded in; one that repeats for ever is left running.
async function motionEnded(page) {
    await page.evaluate(async (limit) => {
        if (typeof document.getAnimations !== 'function')
            return;
        const ending = document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
        await Promise.race([
            Promise.all(ending.map((a) => a.finished.catch(() => undefined))),
            new Promise((done) => setTimeout(done, limit)),
        ]);
    }, MOTION_LIMIT_MS);
}
// One screen in one look: opened afresh, so a layout that measures on load sees the real size.
async function findingsOf(page, screen, look, options) {
    await page.setViewportSize(look.size);
    const where = `${screen.name} ${String(look.size.width)}x${String(look.size.height)} ${String(look.font)}px ${look.theme}`;
    // A screen that does not open is a finding of its own; the others are still seen.
    try {
        await screen.open(page);
    }
    catch (error) {
        const why = error instanceof Error ? error.message.split('\n')[0] : String(error);
        return [`${where}: did not open: ${why ?? ''}`];
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
    await motionEnded(page);
    const found = [
        ...linesOf(await probe(page, options.targetPx)),
        ...(options.axe === false ? [] : (await options.axe(page)).map((v) => `axe: ${v}`)),
    ];
    return found
        .filter((line) => !(screen.allow ?? []).some((known) => line.includes(known)))
        .map((line) => `${where}: ${line}`);
}
function looksOf(options) {
    return (options.sizes ?? SWEEP_SIZES).flatMap((size) => (options.fonts ?? [16, 32]).flatMap((font) => (options.themes ?? ['light', 'dark']).map((theme) => ({ size, font, theme }))));
}
export async function sweep(page, screens, options) {
    const looks = looksOf(options);
    // Nothing to look at would pass every time.
    if (screens.length === 0 || looks.length === 0)
        throw new Error('the sweep has nothing to see');
    const findings = [];
    for (const screen of screens) {
        for (const look of looks) {
            findings.push(...(await findingsOf(page, screen, look, options)));
        }
    }
    if (findings.length > 0) {
        throw new Error(`the sweep found ${String(findings.length)}:\n${findings.join('\n')}`);
    }
    return screens.length * looks.length;
}
