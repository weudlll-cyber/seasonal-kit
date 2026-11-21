/**
 * @file   tests/css-vars.test.ts
 * @brief  Every custom property the kit's CSS reads is the kit's own: a token of css/tokens.css,
 *         an `--sk-` property, or the screen's scale `--fit`.
 *
 * Responsibility: a shared stylesheet never depends on a single game's token, so it looks the
 *                 same in every game that imports css/tokens.css. Each `--sk-` property read is
 *                 also defined somewhere in css/.
 * Depends on:     vitest, node:fs, ../scripts/css-tokens.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readTokens } from '../scripts/css-tokens.mjs';

const dir = new URL('../css/', import.meta.url);
const sheets = readdirSync(dir).filter((f) => f.endsWith('.css'));
const text = (file: string): string =>
  readFileSync(new URL(file, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = readTokens(text('tokens.css')).light;
const defined = new Set(
  sheets.flatMap((f) => [...text(f).matchAll(/(--sk-[\w-]+)\s*:/g)].map((m) => m[1])),
);

describe('the custom properties the kit reads', () => {
  it.each(sheets)('%s reads only kit properties', (file) => {
    const read = [...text(file).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? '');
    const foreign = read.filter(
      (name) => !(tokens.has(name) || name === '--fit' || defined.has(name)),
    );
    expect(foreign).toEqual([]);
  });
});
