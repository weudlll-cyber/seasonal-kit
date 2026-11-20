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
export type Theme = 'light' | 'dark';
export declare function storedTheme(): Theme | null;
export declare function storeTheme(theme: Theme): void;
export declare const systemTheme: () => Theme;
export declare function resolveTheme(): Theme;
