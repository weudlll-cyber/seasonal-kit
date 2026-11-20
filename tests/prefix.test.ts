/**
 * @file   tests/prefix.test.ts
 * @brief  Every class and keyframe the kit's CSS defines is `sk-` prefixed (DECISIONS K7).
 *
 * Responsibility: a shared name never collides with a game's own `sbr-`/`smg-` names; the rule
 *                 holds for every file in css/, present and future.
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
    expect(files).toEqual(expect.arrayContaining(['tokens.css', 'motion.css', 'fonts.css']));
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
