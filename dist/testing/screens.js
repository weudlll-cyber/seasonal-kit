/**
 * @file   src/testing/screens.ts
 * @brief  The sizes the games' screens are seen at, the theme switch and the screenshots of a look
 *         in a browser test.
 *
 * Responsibility: `SWEEP_SIZES` is the default list of ./sweep (three desktops, four phones, the
 *                 smallest 320x568). `setTheme(page, theme)` puts the page in a theme the way a
 *                 person does, by the header's `theme-toggle`, and where that is hidden (a
 *                 round's focus mode) or absent sets `data-theme` on <html>, which is what the
 *                 tokens follow; it returns once nothing that ends is moving (`settle`, on
 *                 ./sweepMotion since v0.39.1, which also waits for a late start and gives up
 *                 after 5 s with an error), so a picture or a measurement never catches a fade;
 *                 both take the motion a game declares as meant. `captureLook(page, dir, name, show?)` saves
 *                 `<name>-desktop-light.jpg` … `<name>-phone-dark.jpg` (`show` is scrolled to the
 *                 middle first) and puts the window size and theme back. Types only come from
 *                 Playwright: nothing of it is imported when this runs.
 * Depends on:     node:path, ./sweepMotion; @playwright/test (types)
 * Source:         seasonal-bingo-royale e2e/screens.ts at 8d20904 (`DESKTOP`, `PHONE`,
 *                 `captureLook`, the wait for running animations) and seasonal-mini-games
 *                 e2e/screens.ts at 9e3c6f3 (the toggle-hidden fallback). Generalised: the
 *                 folder is a parameter.
 */
import path from 'node:path';
import { motionEnded, stillMoving } from './sweepMotion.js';
export const DESKTOP = { width: 1280, height: 800 };
export const PHONE = { width: 390, height: 844 };
export const SWEEP_SIZES = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 768 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 360, height: 780 },
    { width: 320, height: 568 },
];
const themeNow = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
// Waits until no animation or transition that ends is moving (./sweepMotion); throws where that
// does not come within its limit.
export async function settle(page, meant = []) {
    const moving = await motionEnded(page, meant);
    if (typeof moving === 'string')
        throw new Error(stillMoving(moving));
}
// The theme alone, without a wait: ./sweep waits once, after it has set up the whole look.
export async function applyTheme(page, theme) {
    if ((await themeNow(page)) !== theme) {
        const toggle = page.getByTestId('theme-toggle').first();
        if (await toggle.isVisible())
            await toggle.click();
        // No toggle to press, or it set another theme: the attribute is what the tokens follow.
        if ((await themeNow(page)) !== theme) {
            await page.evaluate((wanted) => {
                document.documentElement.setAttribute('data-theme', wanted);
            }, theme);
        }
    }
}
export async function setTheme(page, theme, meant = []) {
    await applyTheme(page, theme);
    await settle(page, meant);
}
export async function captureLook(page, dir, name, show) {
    const size = page.viewportSize() ?? DESKTOP;
    const before = (await themeNow(page)) === 'dark' ? 'dark' : 'light';
    for (const [label, look] of [
        ['desktop', DESKTOP],
        ['phone', PHONE],
    ]) {
        await page.setViewportSize(look);
        for (const theme of ['light', 'dark']) {
            await setTheme(page, theme);
            await show?.evaluate((el) => {
                el.scrollIntoView({ block: 'center' });
            });
            await page.screenshot({
                path: path.join(dir, `${name}-${label}-${theme}.jpg`),
                quality: 75,
            });
        }
    }
    await page.setViewportSize(size);
    await setTheme(page, before);
}
