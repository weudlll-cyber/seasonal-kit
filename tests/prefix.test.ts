/**
 * @file   tests/prefix.test.ts
 * @brief  Every class and keyframe the kit's CSS defines is `sk-` prefixed (DECISIONS K7).
 *
 * Responsibility: a shared name never collides with a game's own `sbr-`/`smg-` names; the rule
 *                 holds for every file in css/, present and future.
 * Source:         new in the kit.
 */
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const dir = new URL('../css/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));

// Class selectors and keyframe names, with comments (they mention other games' prefixes) and
// quoted strings (url('….woff2') is no class) removed.
function names(css: string): string[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'|"[^"]*"/g, '');
  const classes = [...text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1] ?? '');
  const keyframes = [...text.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1] ?? '');
  return [...classes, ...keyframes];
}

describe('the sk- prefix', () => {
  it('finds the CSS files', () => {
    expect(files).toEqual(
      expect.arrayContaining(['tokens.css', 'motion.css', 'fonts.css', 'call.css']),
    );
  });

  it.each(files)('%s names every class and keyframe sk-…', (file) => {
    const found = names(readFileSync(new URL(file, dir), 'utf8'));
    expect(found.filter((n) => !n.startsWith('sk-'))).toEqual([]);
  });

  it('catches an unprefixed name', () => {
    expect(names('.smg-anim-win { animation: smg-glow 1s; } @keyframes smg-glow {}')).toEqual([
      'smg-anim-win',
      'smg-glow',
    ]);
  });

  it('reads no class out of a quoted file name', () => {
    expect(names(`@font-face { src: url('../fonts/a.woff2'); } .x-y { content: ".z"; }`)).toEqual([
      'x-y',
    ]);
  });
});

// The data attributes a text names: `data-x-y` in markup, selectors and strings, and
// `dataset['xY']` in code (as `x-y`).
function attributes(text: string): string[] {
  const plain = [...text.matchAll(/\bdata-([a-z][a-z0-9-]*)/g)].map((m) => m[1] ?? '');
  const viaDataset = [...text.matchAll(/dataset\[['"]([A-Za-z0-9]+)['"]\]/g)].map((m) =>
    (m[1] ?? '').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
  );
  return [...plain, ...viaDataset];
}

// Two attributes are not the kit's to prefix: `data-testid`, the testing library's convention
// every game's tests use, and `data-theme`, the website's (its tokens.css, compared by CI).
const NOT_OURS = new Set(['testid', 'theme']);
const root = new URL('../', import.meta.url);
// What the kit ships or sets: its CSS, its source (tests aside) and the early script.
const shipped = [
  ...files.map((f) => `css/${f}`),
  ...readdirSync(new URL('src/', root), { recursive: true })
    .map(String)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `src/${f.replace(/\\/g, '/')}`),
  'browser/theme-init.js',
];

describe('the data-sk- prefix (since v0.10.1)', () => {
  it.each(shipped)('%s names every data attribute data-sk-…', (file) => {
    const found = attributes(readFileSync(new URL(file, root), 'utf8'));
    expect(found.filter((n) => !n.startsWith('sk-') && !NOT_OURS.has(n))).toEqual([]);
  });

  it('catches an unprefixed attribute in markup, a selector and a dataset', () => {
    expect(attributes(`<div data-view="phone"> [data-open='true'] el.dataset['fitScale']`)).toEqual(
      ['view', 'open', 'fit-scale'],
    );
  });
});
