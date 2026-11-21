/**
 * @file   tests/fit-floors.test.ts
 * @brief  The floor guard: no game's floor below what that game has today, and css/fit.css
 *         equal to `FIT_FLOORS` (DECISIONS K14).
 *
 * Responsibility: `TODAY` is each game's floor as its own repository has it. Mini Games: O111,
 *                 13 px text, 24 px display values, 22 px rows, 40 px phone touch targets and the
 *                 scale floor 0.6. Bingo: 14 px text, no screen scale, 44 px targets. Its 24/22 px
 *                 have no rule of their own there, so they take Mini Games'. A kit floor lower
 *                 than today, a CSS value differing from `FIT_FLOORS`, or a default (no game
 *                 named) below any game fails here. Every kit stylesheet's `max()` floor must be
 *                 a floor variable or no smaller than the strictest text floor.
 * Depends on:     vitest, node:fs, ../src/fit
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts (FIT_FLOOR) and its CSS at
 *                 866df03; seasonal-bingo-royale apps/web/src/minTextSize.test.ts at a43209a
 */
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FIT_FLOORS, type FitFloors, type FitGame } from '../src/fit.js';

const TODAY: Readonly<Record<FitGame, FitFloors>> = {
  'mini-games': { scale: 0.6, text: 13, display: 24, row: 22, target: 40 },
  bingo: { scale: 1, text: 14, display: 24, row: 22, target: 44 },
};

const KINDS = ['text', 'display', 'row', 'target'] as const;
const dir = new URL('../css/', import.meta.url);
const css = readFileSync(new URL('fit.css', dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// The floor custom properties of the first rule for `selector`, in px.
function floorsOf(selector: string): Record<string, number> {
  const at = css.indexOf(`${selector} {`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries(
    [...body.matchAll(/--sk-floor-(\w+):\s*([\d.]+)px/g)].map((m): [string, number] => [
      m[1] ?? '',
      Number(m[2]),
    ]),
  );
}

describe('the floor guard', () => {
  it.each(Object.keys(TODAY) as FitGame[])('never lets %s go below today', (game) => {
    const kit = FIT_FLOORS[game];
    const today = TODAY[game];
    expect(kit.scale).toBeGreaterThanOrEqual(today.scale);
    for (const kind of KINDS) expect(kit[kind]).toBeGreaterThanOrEqual(today[kind]);
  });

  it.each(Object.keys(FIT_FLOORS) as FitGame[])('writes the floors of %s into fit.css', (game) => {
    const floors = FIT_FLOORS[game];
    expect(floorsOf(`[data-sk-game='${game}']`)).toEqual({
      text: floors.text,
      display: floors.display,
      row: floors.row,
      target: floors.target,
    });
  });

  it('defaults to the strictest floor of all games', () => {
    const root = floorsOf(':root');
    for (const kind of KINDS) {
      const strictest = Math.max(...Object.values(FIT_FLOORS).map((f) => f[kind]));
      expect(root[kind]).toBe(strictest);
    }
  });

  it('floors every scaled size of the kit with a floor variable or ≥ the strictest text', () => {
    const strictText = Math.max(...Object.values(FIT_FLOORS).map((f) => f.text));
    const sheets = readdirSync(dir).filter((f) => f.endsWith('.css'));
    const low = sheets.flatMap((file) =>
      [...readFileSync(new URL(file, dir), 'utf8').matchAll(/max\(\s*([^,]+),\s*calc\(var\(--fit/g)]
        .map((m) => (m[1] ?? '').trim())
        .filter((first) => !first.startsWith('var(--sk-floor-'))
        .filter((first) => Number.parseFloat(first) < strictText)
        .map((first) => `${file}: ${first}`),
    );
    expect(low).toEqual([]);
  });
});
