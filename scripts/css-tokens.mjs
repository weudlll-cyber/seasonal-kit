/**
 * @file   scripts/css-tokens.mjs
 * @brief  Reads the custom properties of a tokens stylesheet, per theme.
 *
 * Responsibility: one parser for the kit's own css/tokens.css (tests/tokens.test.ts,
 *                 scripts/contrast.mjs) and the website's tokens.css (scripts/season-check.mjs):
 *                 the declarations of `:root { … }` (light) and `:root[data-theme='dark'] { … }`
 *                 (dark), comments removed, values with their whitespace collapsed. Plain
 *                 JavaScript, so CI runs the season check with Node alone, without an install.
 * Source:         new.
 */

/** @typedef {{ light: Map<string, string>, dark: Map<string, string> }} Tokens */

// `:root` alone, or with the dark theme's attribute in either quote style.
const BLOCK = /:root(\[data-theme=(['"])dark\2\])?\s*\{([^}]*)\}/g;
const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;

/**
 * @param {string} css
 * @returns {Tokens}
 */
export function readTokens(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** @type {Tokens} */
  const tokens = { light: new Map(), dark: new Map() };
  for (const block of text.matchAll(BLOCK)) {
    const theme = block[1] ? tokens.dark : tokens.light;
    for (const [, name, value] of (block[3] ?? '').matchAll(DECLARATION)) {
      if (name && value) theme.set(name, value.replace(/\s+/g, ' ').trim());
    }
  }
  return tokens;
}

/**
 * The value `name` has in `theme`: the dark theme falls back to light where it sets nothing.
 * @param {Tokens} tokens
 * @param {'light' | 'dark'} theme
 * @param {string} name
 * @returns {string | undefined}
 */
export const tokenValue = (tokens, theme, name) =>
  (theme === 'dark' ? tokens.dark.get(name) : undefined) ?? tokens.light.get(name);
