/**
 * @file   scripts/contrast.mjs
 * @brief  The WCAG AA contrast check of the kit's text tokens (tests/contrast.test.ts).
 *
 * Responsibility: every text colour on every background it is used on, in both themes, at
 *                 4.5:1 or more: the text on each season colour, the text and muted text on the
 *                 page, the surfaces and the translucent card (laid over the page's base colour),
 *                 on every stop of the header's gradient (since v0.10.0), and the solid pill's
 *                 text. The focus ring at 3:1 against the same backgrounds (WCAG 1.4.11). WCAG
 *                 2.2 relative luminance and contrast ratio.
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

// Non-text contrast (WCAG 1.4.11): a focus ring against what is next to it.
export const NON_TEXT = 3;

/**
 * The header's background, `--sidebar-background`: a gradient whose colour stops, each laid over
 * the gradient's trailing base colour (dark) or the page (light), are the backgrounds the
 * header's text and focus ring sit on. Every stop is checked, so the whole width is.
 * @param {import('./css-tokens.mjs').Tokens} tokens
 * @param {'light' | 'dark'} theme
 * @returns {Rgba[]}
 */
export function sidebarStops(tokens, theme) {
  const value = tokenValue(tokens, theme, '--sidebar-background') ?? 'missing --sidebar-background';
  const colours = [...value.matchAll(/#[0-9a-f]{6}|rgb\([^)]*\)/gi)].map((m) => parseColour(m[0]));
  // A colour after the gradient's closing parenthesis is the base the stops are laid over.
  const hasBase = /\)\s*,\s*(?:#[0-9a-f]{6}|rgb\([^)]*\))\s*$/i.test(value);
  const base = hasBase ? colours.pop() : undefined;
  const under = base ?? parseColour(tokenValue(tokens, theme, '--color-background') ?? '');
  if (colours.length === 0) throw new Error(`No colour stops in --sidebar-background: ${value}`);
  return colours.map((stop) => over(stop, under));
}

/**
 * The opaque backgrounds a colour is checked on in `theme`, by name: the page, surfaces and
 * card (laid over the page), and each stop of the header's background.
 * @param {import('./css-tokens.mjs').Tokens} tokens
 * @param {'light' | 'dark'} theme
 * @param {readonly string[]} names
 * @returns {[string, Rgba][]}
 */
function backgroundsOf(tokens, theme, names) {
  /** @type {(name: string) => Rgba} */
  const colour = (name) => parseColour(tokenValue(tokens, theme, name) ?? `missing ${name}`);
  const page = colour('--color-background');
  return [
    ...names.map((name) => /** @type {[string, Rgba]} */ ([name, over(colour(name), page)])),
    ...sidebarStops(tokens, theme).map(
      (stop, i) =>
        /** @type {[string, Rgba]} */ ([`--sidebar-background stop ${String(i + 1)}`, stop]),
    ),
  ];
}

/**
 * Every pair below AA in either theme: the pairs above, and the text and muted text on each
 * stop of the header's background (audit 2026-11-22, B7 finding 10).
 * @param {import('./css-tokens.mjs').Tokens} tokens
 * @returns {{ theme: string, text: string, background: string, ratio: number }[]}
 */
export function contrastFailures(tokens) {
  /** @type {(theme: 'light' | 'dark', name: string) => Rgba} */
  const colour = (theme, name) => parseColour(tokenValue(tokens, theme, name) ?? `missing ${name}`);
  return /** @type {const} */ (['light', 'dark']).flatMap((theme) => {
    const page = colour(theme, '--color-background');
    const pairs = PAIRS.map(([text = '', background = '']) => ({
      theme,
      text,
      background,
      // A translucent background (the card) is seen over the page's base colour.
      ratio: contrast(colour(theme, text), over(colour(theme, background), page)),
    }));
    const header = ['--color-text', '--color-text-muted'].flatMap((text) =>
      sidebarStops(tokens, theme).map((stop, i) => ({
        theme,
        text,
        background: `--sidebar-background stop ${String(i + 1)}`,
        ratio: contrast(colour(theme, text), stop),
      })),
    );
    return [...pairs, ...header].filter((p) => p.ratio < AA);
  });
}

/**
 * Where the focus ring, the token `ring` names, falls below 3:1 against a background it is
 * drawn on, in either theme (css/shell.css `--sk-focus-ring`).
 * @param {import('./css-tokens.mjs').Tokens} tokens
 * @param {string} ring
 * @returns {{ theme: string, background: string, ratio: number }[]}
 */
export function focusRingFailures(tokens, ring) {
  return /** @type {const} */ (['light', 'dark']).flatMap((theme) => {
    const colour = parseColour(tokenValue(tokens, theme, ring) ?? `missing ${ring}`);
    return backgroundsOf(tokens, theme, BACKGROUNDS)
      .map(([background, rgba]) => ({ theme, background, ratio: contrast(colour, rgba) }))
      .filter((p) => p.ratio < NON_TEXT);
  });
}
