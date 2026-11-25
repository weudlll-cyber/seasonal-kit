/**
 * @file   tests/season-check.test.ts
 * @brief  The season comparisons: equal passes, any changed or missing colour or icon byte fails.
 *
 * Responsibility: scripts/season-check.mjs's `seasonDiff` against a copy of the website's
 *                 declarations (its tokens.css lines 16-19 and 25 on master, 2026-11-20). CI runs
 *                 the same comparisons against the live site, the icons' among them (K83).
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { iconDiff, SEASON_TOKENS, seasonDiff } from '../scripts/season-check.mjs';

const kit = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const site = `:root {
  --color-spring: #afb84e;
  --color-summer: #e06e22;
  --color-autumn: #f9a825;
  --color-winter: #04aaf7;
  --color-coin-eth: #6d4fd6;
  --color-on-season: #14171c;
}
:root[data-theme='dark'] { --color-coin-eth: #a796ff; }`;

describe('seasonDiff', () => {
  it("passes the kit's copy against the website's values", () => {
    expect(seasonDiff(kit, site)).toEqual([]);
  });

  it.each(SEASON_TOKENS)('fails when the website changes %s', (name) => {
    const changed = site.replace(new RegExp(`${name}: #[0-9a-f]+`), `${name}: #123456`);
    expect(seasonDiff(kit, changed)).toEqual([
      { name, kit: expect.stringMatching(/^#/) as unknown, site: '#123456' },
    ]);
  });

  it('fails when the kit changes one value, or a side lacks a token', () => {
    expect(seasonDiff(kit.replace('#e06e22', '#e06e23'), site)).toHaveLength(1);
    expect(seasonDiff(kit, site.replace(/--color-winter[^;]+;/, ''))).toEqual([
      { name: '--color-winter', kit: '#04aaf7', site: undefined },
    ]);
  });

  it('ignores the case of a hex value', () => {
    expect(seasonDiff(kit, site.replace('#afb84e', '#AFB84E'))).toEqual([]);
  });
});

describe('iconDiff', () => {
  const bytes = (text: string) => new TextEncoder().encode(text);
  const icon = (season: string, kit: string, site: string) => ({
    season,
    kit: bytes(kit),
    site: bytes(site),
  });

  it('passes files that are the same bytes', () => {
    expect(iconDiff([icon('spring', '<svg/>', '<svg/>')])).toEqual([]);
  });

  it.each([
    ['one byte changed', '<svg />'],
    ['a line ending added', '<svg/>\n'],
    ['an empty answer', ''],
  ])('names the season with %s', (_name, site) => {
    expect(iconDiff([icon('spring', '<svg/>', '<svg/>'), icon('winter', '<svg/>', site)])).toEqual([
      'winter',
    ]);
  });
});
