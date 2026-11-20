/**
 * @file   src/theme.ts
 * @brief  Light and dark theme, framework-free: the website's theme logic for every game.
 *
 * Responsibility: resolve the theme as ../browser/theme-init.js does before the first paint —
 *                 a stored choice (localStorage `se.theme`, the website's key) wins, otherwise
 *                 the system setting —, store a choice, set it on <html data-theme>, and tell
 *                 about changes of the system setting and of the shown theme. Every storage
 *                 access is in try/catch: with storage blocked the system setting applies and a
 *                 toggle still works for the visit. A game's own toggle (React or not) is built
 *                 on these.
 * Source:         seasonal-mini-games apps/web/src/shell/theme.ts at 93ed780 (its React hooks
 *                 left in the game); seasonal-bingo-royale apps/web/src/shell/theme.ts at
 *                 c3b76c1 has the same logic without the shown-theme part.
 * Spec:           Seasonal Entertainment docs/DESIGN.md "Theme logic"
 */
// The website's storage key: one choice holds on the site and in every game on its origin.
const KEY = 'se.theme';
const QUERY = '(prefers-color-scheme: dark)';
export function storedTheme() {
    try {
        const value = window.localStorage.getItem(KEY);
        return value === 'light' || value === 'dark' ? value : null;
    }
    catch {
        return null;
    }
}
export function storeTheme(theme) {
    try {
        window.localStorage.setItem(KEY, theme);
    }
    catch {
        // Blocked storage: the choice holds for this visit only.
    }
}
export const systemTheme = () => (window.matchMedia(QUERY).matches ? 'dark' : 'light');
// The same resolution as the early script.
export function resolveTheme() {
    return storedTheme() ?? systemTheme();
}
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}
// Calls `changed` with the system's theme whenever the system setting changes while nothing is
// stored (a stored choice wins, so the change is not followed then); returns the unsubscribe.
export function onSystemThemeChange(changed) {
    const media = window.matchMedia(QUERY);
    const onChange = () => {
        if (storedTheme() === null)
            changed(systemTheme());
    };
    media.addEventListener('change', onChange);
    return () => {
        media.removeEventListener('change', onChange);
    };
}
// The theme the page shows now, as <html data-theme> says (set by the early script and the
// toggle); 'auto' before either has set it, which the website's chat resolves by the same rule.
export function shownTheme() {
    const value = document.documentElement.getAttribute('data-theme');
    return value === 'light' || value === 'dark' ? value : 'auto';
}
// Calls `changed` whenever <html data-theme> changes (parts that must match the page, such as
// the website's chat frame); returns the unsubscribe.
export function onShownThemeChange(changed) {
    const observer = new MutationObserver(changed);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
        observer.disconnect();
    };
}
