/**
 * @file   tests/floor-default.test.ts
 * @brief  `--sk-floor-text` has a default outside fit.css, and fit.css still wins (K41, v0.13.0).
 *
 * Responsibility: css/tokens.css gives the text floor a default of the strictest floor of all
 *                 games, in a rule of zero specificity (`:where(:root)`), so a game that loads no
 *                 fit.css has a floor under the header, the bar and the dock, and one that loads
 *                 it gets its own values whatever the order of the two files. It is not one of the
 *                 49 shared tokens and not read as one.
 * Depends on:     vitest, node:fs, ../scripts/css-tokens.mjs, ../src/fit
 * Source:         seasonal-bingo-royale apps/web/src/shell/header.css at 3a00729 (its note that
 *                 it loads no fit.css, so the floor is not set).
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readTokens } from '../scripts/css-tokens.mjs';
import { FIT_FLOORS } from '../src/fit.js';

const tokens = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('the text floor default (K41)', () => {
  it('is the strictest text floor of all games, in a rule of zero specificity', () => {
    const strictest = Math.max(...Object.values(FIT_FLOORS).map((f) => f.text));
    const rule = String.raw`:where\(:root\)\s*\{\s*--sk-floor-text:\s*${String(strictest)}px;\s*\}`;
    expect(tokens).toMatch(new RegExp(rule));
  });

  it('is not a shared token: the 49 are unchanged and none is the floor', () => {
    const light = readTokens(tokens).light;
    expect(light.size).toBe(49);
    expect(light.has('--sk-floor-text')).toBe(false);
  });
});
