/**
 * @file   scripts/season-check.mjs
 * @brief  CI's season check: the kit's season colours and icons must equal the website's
 *         master.
 *
 * Responsibility: the website is the single source of the season colours (docs/DECISIONS.md
 *                 K3). Its names are `--color-…`, the kit's copies `--sk-color-…` (v0.14.0).
 *                 The icons are the website's four optimized files (K83). Run as
 *                 `node scripts/season-check.mjs`, it fetches the site's public tokens.css and
 *                 icons from master and fails (exit 1) on any difference in the four season
 *                 colours, the text colour on them or a byte of an icon; exit 2 when the site
 *                 cannot be read, so a network failure is never a pass. `seasonDiff` and
 *                 `iconDiff` are the comparisons (tests/season-check.test.ts).
 * Source:         new.
 */
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';

import { readTokens } from './css-tokens.mjs';

const SITE =
  'https://raw.githubusercontent.com/weudlll-cyber/seasonal-entertainment/master/client/src';

export const SEASON_ICONS = ['spring', 'summer', 'autumn', 'winter'];

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
  // The website names them `--color-spring`; the kit's copy has them as `--sk-color-spring`
  // (since v0.14.0), so the kit is read under its own name and reported under the site's.
  return SEASON_TOKENS.map((name) => ({
    name,
    kit: kit.get(`--sk-${name.slice(2)}`),
    site: site.get(name),
  })).filter(
    (d) =>
      d.kit === undefined || d.site === undefined || d.kit.toLowerCase() !== d.site.toLowerCase(),
  );
}

/**
 * The seasons whose icon differs in any byte.
 * @param {{ season: string, kit: Uint8Array, site: Uint8Array }[]} icons
 * @returns {string[]}
 */
export function iconDiff(icons) {
  return icons.filter((i) => Buffer.compare(i.kit, i.site) !== 0).map((i) => i.season);
}

/**
 * One file of the website's master; a site that cannot be read ends the run (exit 2).
 * @param {string} path
 */
async function fromSite(path) {
  const address = `${SITE}/${path}`;
  const response = await fetch(address).catch(() => null);
  if (!response?.ok) {
    console.error(`Cannot read ${address} (${String(response?.status ?? 'no answer')})`);
    exit(2);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** @param {string} path one of the kit's files */
const own = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

async function main() {
  const siteCss = (await fromSite('styles/tokens.css')).toString('utf8');
  const colours = seasonDiff(own('css/tokens.css').toString('utf8'), siteCss);
  for (const d of colours) {
    console.error(`${d.name}: kit ${String(d.kit)}, website ${String(d.site)}`);
  }
  const icons = iconDiff(
    await Promise.all(
      SEASON_ICONS.map(async (season) => ({
        season,
        kit: own(`seasons/${season}.svg`),
        site: await fromSite(`assets/seasons/${season}.svg`),
      })),
    ),
  );
  for (const season of icons) console.error(`seasons/${season}.svg differs from the website's`);
  if (colours.length + icons.length > 0) exit(1);
  console.log(
    `Season colours (${String(SEASON_TOKENS.length)} tokens) and icons (${String(SEASON_ICONS.length)} files) equal the website's master.`,
  );
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) await main();
