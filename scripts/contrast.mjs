/**
 * @file   scripts/contrast.mjs
 * @brief  The WCAG AA contrast check of the kit's text tokens (tests/contrast.test.ts).
 *
 * Responsibility: every text colour on every background it is used on, in both themes, at
 *                 4.5:1 or more: the text on each season colour, the text and muted text on the
 *                 page, the surfaces and the translucent card (laid over the page's base colour),
 *                 and the solid pill's text. WCAG 2.2 relative luminance and contrast ratio.
 * Source:         new (Mini Games checks its own tokens in apps/web/src/designTokens.test.ts at
 *                 93ed780; this is the kit's check of the shared ones).
 */
import { tokenValue } from './css-tokens.mjs';

export const AA = 4.5;

/** @typedef {[number, number, number, number]} Rgba channels 0-255, alpha 0-1 */

/**
 * `#rrggbb` or `rgb(r g b / a%)`, the two forms the tokens use.
 * @param {string} value
 * @returns {Rgba}
 */
export function parseColour(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ (\d+)%)?\)$/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Number(rgb[4] ?? 100) / 100];
  throw new Error(`Not a colour the check reads: ${value}`);
}

/**
 * `top` laid over the opaque `under`.
 * @param {Rgba} top
 * @param {Rgba} under
 * @returns {Rgba}
 */
const over = (top, under) => [
  top[0] * top[3] + under[0] * (1 - top[3]),
  top[1] * top[3] + under[1] * (1 - top[3]),
  top[2] * top[3] + under[2] * (1 - top[3]),
  1,
];

/** @param {Rgba} c */
function luminance(c) {
  const [r, g, b] = [c[0], c[1], c[2]].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * @param {Rgba} a
 * @param {Rgba} b
 */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const SEASONS = ['--color-spring', '--color-summer', '--color-autumn', '--color-winter'];
const BACKGROUNDS = ['--color-background', '--color-surface', '--color-surface-2', '--color-card'];
// Text token → the backgrounds it is read on.
const PAIRS = [
  ...SEASONS.map((s) => ['--color-on-season', s]),
  ...['--color-text', '--color-text-muted'].flatMap((t) => BACKGROUNDS.map((b) => [t, b])),
  ['--color-on-solid', '--color-solid'],
];

/**
 * Every pair below AA in either theme.
 * @param {import('./css-tokens.mjs').Tokens} tokens
 * @returns {{ theme: string, text: string, background: string, ratio: number }[]}
 */
export function contrastFailures(tokens) {
  /** @type {(theme: 'light' | 'dark', name: string) => Rgba} */
  const colour = (theme, name) => parseColour(tokenValue(tokens, theme, name) ?? `missing ${name}`);
  return /** @type {const} */ (['light', 'dark']).flatMap((theme) => {
    const page = colour(theme, '--color-background');
    return PAIRS.map(([text = '', background = '']) => ({
      theme,
      text,
      background,
      // A translucent background (the card) is seen over the page's base colour.
      ratio: contrast(colour(theme, text), over(colour(theme, background), page)),
    })).filter((p) => p.ratio < AA);
  });
}
