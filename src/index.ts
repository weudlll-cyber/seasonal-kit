/**
 * @file   src/index.ts
 * @brief  Public entry point of @seasonal/kit (the TS side; the CSS files are their own exports).
 *
 * Responsibility: name everything a game may import from the package root.
 */
export { resolveTheme, storedTheme, storeTheme, systemTheme, type Theme } from './theme.js';
