/**
 * @file   scripts/season-check.mjs
 * @brief  CI's season colour check: the kit's copy must equal the website's master.
 *
 * Responsibility: the website is the single source of the season colours (docs/DECISIONS.md
 *                 K3). Run as `node scripts/season-check.mjs`, it fetches the site's public
 *                 tokens.css from master and fails (exit 1) on any difference in the four season
 *                 colours or the text colour on them; exit 2 when the site cannot be read, so a
 *                 network failure is never a pass. `seasonDiff` is the comparison
 *                 (tests/season-check.test.ts).
 * Source:         new.
 */
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';

import { readTokens } from './css-tokens.mjs';

export const SITE_TOKENS =
  'https://raw.githubusercontent.com/weudlll-cyber/seasonal-entertainment/master/client/src/styles/tokens.css';

// The site's lines 16-19 and the text on them (its line 25); none of them changes in dark.
export const SEASON_TOKENS = [
  '--color-spring',
  '--color-summer',
  '--color-autumn',
  '--color-winter',
  '--color-on-season',
];

/**
 * Every season token whose value differs, or that one side lacks (as `undefined`).
 * @param {string} kitCss
 * @param {string} siteCss
 * @returns {{ name: string, kit: string | undefined, site: string | undefined }[]}
 */
export function seasonDiff(kitCss, siteCss) {
  const kit = readTokens(kitCss).light;
  const site = readTokens(siteCss).light;
  return SEASON_TOKENS.map((name) => ({ name, kit: kit.get(name), site: site.get(name) })).filter(
    (d) =>
      d.kit === undefined || d.site === undefined || d.kit.toLowerCase() !== d.site.toLowerCase(),
  );
}

async function main() {
  const response = await fetch(SITE_TOKENS).catch(() => null);
  if (!response?.ok) {
    console.error(`Cannot read ${SITE_TOKENS} (${String(response?.status ?? 'no answer')})`);
    exit(2);
  }
  const kitCss = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
  const diff = seasonDiff(kitCss, await response.text());
  for (const d of diff) console.error(`${d.name}: kit ${String(d.kit)}, website ${String(d.site)}`);
  if (diff.length > 0) exit(1);
  console.log(
    `Season colours equal the website's master (${String(SEASON_TOKENS.length)} tokens).`,
  );
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) await main();
