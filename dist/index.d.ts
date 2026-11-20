/**
 * @file   src/index.ts
 * @brief  Public entry point of @seasonal/kit for the browser (the theme logic).
 *
 * Responsibility: name everything a game's browser code may import from the package root. The
 *                 CSS files and the early theme script are their own exports; the Vite plugin
 *                 is `@seasonal/kit/vite` (Node only, kept out of browser bundles).
 */
export { applyTheme, onShownThemeChange, onSystemThemeChange, resolveTheme, shownTheme, storedTheme, storeTheme, systemTheme, type Theme, } from './theme.js';
