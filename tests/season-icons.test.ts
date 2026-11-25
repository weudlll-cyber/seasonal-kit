/**
 * @file   tests/season-icons.test.ts
 * @brief  The shipped season icons are the recorded bytes, drawn by the stylesheet and exported
 *         (K83).
 *
 * Responsibility: each file of seasons/ keeps the hash its licence note records (CI compares it
 *                 with the website's, scripts/season-check.mjs); the note says whose they are and
 *                 that they are not under the AGPL; css/seasons.css draws each season from its
 *                 file; and the package ships the folder and exports the stylesheet and the files.
 * Depends on:     vitest, node:fs, node:crypto
 * Source:         new in the kit.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { SEASON_ICONS } from '../scripts/season-check.mjs';

const file = (path: string): URL => new URL(`../${path}`, import.meta.url);
const read = (path: string): string => readFileSync(file(path), 'utf8');
const note = read('seasons/README.md');
const pkg = JSON.parse(read('package.json')) as {
  files: string[];
  exports: Record<string, unknown>;
};

describe('the season icons', () => {
  it('are the four files, nothing else', () => {
    const shipped = readdirSync(file('seasons/')).filter((f) => f !== 'README.md');
    expect(shipped.sort()).toEqual(SEASON_ICONS.map((s) => `${s}.svg`).sort());
  });

  it.each(SEASON_ICONS)('%s is the recorded bytes and is drawn from its file', (season) => {
    const bytes = readFileSync(file(`seasons/${season}.svg`));
    const recorded = new RegExp(`\`${season}\\.svg\`.*?\`([0-9a-f]{64})\``).exec(note)?.[1];
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(recorded);
    expect(read('css/seasons.css')).toMatch(
      new RegExp(
        `\\[data-sk-season='${season}'\\] \\{\\s*background-image: url\\('\\.\\./seasons/${season}\\.svg'\\)`,
      ),
    );
  });

  it('carry their licence note', () => {
    expect(note).toContain('belong to the Seasonal Tokens project');
    expect(note).toMatch(/not covered by\s+> this repository's AGPL licence/);
  });

  it('ship with the package, by stylesheet and by path', () => {
    expect(pkg.files).toContain('seasons');
    expect(pkg.exports['./seasons.css']).toBe('./css/seasons.css');
    expect(pkg.exports['./seasons/*.svg']).toBe('./seasons/*.svg');
  });
});
