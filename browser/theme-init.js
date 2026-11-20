/**
 * @file   browser/theme-init.js
 * @brief  Sets the theme on <html> before the first paint (no flash of the wrong theme).
 *
 * Responsibility: the website's theme logic in plain ES5: a stored choice (localStorage
 *                 `se.theme`, "light" or "dark") wins; otherwise the system setting
 *                 (prefers-color-scheme). Loaded synchronously as an external file, because a
 *                 strict CSP forbids inline scripts; a game serves it with the kit's Vite plugin
 *                 (../src/vite.ts). Storage access may throw (blocked storage); the system
 *                 setting applies then. ../src/theme.ts resolves the same way afterwards
 *                 (src/theme.test.ts runs both).
 * Source:         seasonal-mini-games apps/web/public/theme-init.js at 93ed780, equal to
 *                 seasonal-bingo-royale apps/web/public/theme-init.js at c3b76c1 but for a
 *                 comment.
 * Spec:           Seasonal Entertainment docs/DESIGN.md "Theme logic"
 */
(function () {
  var stored;
  try {
    stored = window.localStorage.getItem('se.theme');
  } catch (e) {
    // Blocked storage: the system setting decides (ES5 needs the catch binding).
    stored = null;
  }
  var theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
