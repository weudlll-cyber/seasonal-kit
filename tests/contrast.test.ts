/**
 * @file   tests/contrast.test.ts
 * @brief  The kit's text tokens meet WCAG AA (4.5:1) in both themes; a bad colour fails.
 *
 * Responsibility: scripts/contrast.mjs over css/tokens.css: the text on each season colour, the
 *                 text and muted text on the page, surfaces and card, the solid pill's text —
 *                 light and dark. The check itself is pinned to known ratios and to a sabotaged
 *                 colour, so a broken check cannot pass silently.
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readTokens } from '../scripts/css-tokens.mjs';
import { contrast, contrastFailures, parseColour } from '../scripts/contrast.mjs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

describe('the contrast of the text tokens', () => {
  it('meets AA for every pair in both themes', () => {
    expect(contrastFailures(readTokens(css))).toEqual([]);
  });

  it('fails on a deliberately bad colour, naming the pair and theme', () => {
    const bad = css.replace('--color-text-muted: #b3bcd0;', '--color-text-muted: #3a4466;');
    const failures = contrastFailures(readTokens(bad));
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((f) => f.theme === 'dark' && f.text === '--color-text-muted')).toBe(true);
  });

  it('fails Summer when the text on the seasons turns grey', () => {
    const bad = css.replace('--color-on-season: #14171c;', '--color-on-season: #5a5a5a;');
    expect(contrastFailures(readTokens(bad)).map((f) => f.background)).toContain('--color-summer');
  });
});

describe('the WCAG arithmetic', () => {
  it('gives the known ratios', () => {
    expect(contrast(parseColour('#000000'), parseColour('#ffffff'))).toBeCloseTo(21, 5);
    expect(contrast(parseColour('#14171c'), parseColour('#e06e22'))).toBeCloseTo(5.49, 2);
  });

  it('reads rgb() with and without alpha, and refuses anything else', () => {
    expect(parseColour('rgb(16 26 66 / 72%)')).toEqual([16, 26, 66, 0.72]);
    expect(parseColour('rgb(1 2 3)')).toEqual([1, 2, 3, 1]);
    expect(() => parseColour('var(--x)')).toThrow(/Not a colour/);
  });
});
