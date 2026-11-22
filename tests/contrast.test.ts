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
import {
  contrast,
  contrastFailures,
  focusRingFailures,
  parseColour,
  sidebarColours,
} from '../scripts/contrast.mjs';

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

describe('the header’s background and the focus ring (audit B7, DECISIONS K29)', () => {
  const shell = readFileSync(new URL('../css/shell.css', import.meta.url), 'utf8');
  const ring = /--sk-focus-ring:\s*var\((--[\w-]+)\)/.exec(shell)?.[1] ?? 'missing';

  it('checks the header’s whole gradient: every stop and 15 points between, over its base', () => {
    const tokens = readTokens(css);
    // 4 stops: 3 spans of 16 points, and the last stop.
    expect(sidebarColours(tokens, 'light')).toHaveLength(49);
    // The last stop, rgb(4 170 247 / 30%), over #0c1538.
    expect(sidebarColours(tokens, 'dark')[48]?.map(Math.round)).toEqual([10, 66, 113, 1]);
  });

  it('samples between stops, where a blend can be darker than both (v0.10.0 pass, finding 3)', () => {
    const two = readTokens(
      ':root { --color-background: #ffffff; --sidebar-background: linear-gradient(90deg, #ff0000 0%, #00ff00 100%); }',
    );
    expect(sidebarColours(two, 'light')[8]).toEqual([127.5, 127.5, 0, 1]);
  });

  it.each([
    ['an rgba() stop', 'linear-gradient(90deg, rgba(1, 2, 3, 0.5) 0%, #ffffff 100%)'],
    ['an 8-digit hex stop', 'linear-gradient(90deg, #ffffff80 0%, #ffffff 100%)'],
    ['a named colour', 'linear-gradient(90deg, white 0%, #ffffff 100%)'],
    ['no gradient', '#ffffff'],
  ])('refuses %s instead of skipping it (v0.10.0 pass, finding 2)', (_what, value) => {
    const odd = readTokens(
      `:root { --color-background: #ffffff; --sidebar-background: ${value}; }`,
    );
    expect(() => sidebarColours(odd, 'light')).toThrow(/Not a/);
  });

  it('fails muted text on a header stop it cannot be read on', () => {
    const bad = css.replace('#f8d9c2 35%', '#8a8f99 35%');
    const failures = contrastFailures(readTokens(bad));
    // The second stop is the 17th colour across the width.
    expect(failures.map((f) => f.background)).toContain('--sidebar-background point 17');
  });

  it('draws the focus ring at 3:1 or more on every background, light and dark', () => {
    expect(ring).toBe('--color-text');
    expect(focusRingFailures(readTokens(css), ring)).toEqual([]);
  });

  it('fails a ring as faint as the hairline border', () => {
    const failures = focusRingFailures(readTokens(css), '--color-border-strong');
    expect(failures.length).toBeGreaterThan(0);
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
