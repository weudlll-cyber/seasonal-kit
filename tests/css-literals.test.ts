/**
 * @file   tests/css-literals.test.ts
 * @brief  The kit's own CSS names no literal colour outside css/tokens.css, except two it
 *         documents; a literal would not follow a theme or a token (HANDBOOK, "How a Seasonal
 *         game looks").
 *
 * Responsibility: every `#hex`, `rgb()`, `rgba()` and `hsl()` in css/*.css other than tokens.css
 *                 is a finding, unless its line is in ALLOWED with its reason: the phone dock's
 *                 drop shadow (a black shadow, no palette colour) and the unread badge's dark
 *                 text on the accent (Mini Games' own, 8.4:1, ./contrast.test.ts). The season's
 *                 colours in motion.css come from `--sk-color-autumn`. A game's own CSS is the
 *                 game's to check; this test is the kit's own.
 * Depends on:     vitest, node:fs
 * Source:         new in the kit (night audit 2026-11-25).
 */
import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const dir = new URL('../css/', import.meta.url);
const sheets = readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'tokens.css');
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

// A literal that stays, with its reason: file, then the declaration.
const ALLOWED = new Map([
  ['dock.css', ['box-shadow: 0 -8px 24px rgb(0 0 0 / 18%);', 'color: #0a1233;']],
]);

describe('literal colours in the kit CSS', () => {
  it.each(sheets)('%s names no colour literal but the documented ones', (file) => {
    const text = readFileSync(new URL(file, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const found = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => LITERAL.test(l) && !(ALLOWED.get(file) ?? []).includes(l));
    expect(found).toEqual([]);
  });

  it('every allowed literal is still there (the list does not outlive its lines)', () => {
    for (const [file, lines] of ALLOWED) {
      const text = readFileSync(new URL(file, dir), 'utf8');
      for (const line of lines) expect(text).toContain(line);
    }
  });
});
