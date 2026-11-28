/**
 * @file   tests/fit-floors.test.ts
 * @brief  The floor guard: no game's floor below what that game has today or the owner has set,
 *         one scale floor for all, and css/fit.css equal to `FIT_FLOORS` (DECISIONS K14).
 *
 * Responsibility: `TODAY` is each game's floor as its own repository has it. Mini Games: O111,
 *                 13 px text, 24 px display values, 22 px rows and 40 px phone touch targets.
 *                 Bingo: 14 px text, 44 px targets. Its 24/22 px have no rule of their own there,
 *                 so they take Mini Games'. Seasonal Party and Seasonal Cases (since v0.11.0):
 *                 14 px text, the strictest set otherwise. The scale floor is 0.6 for every game
 *                 (the owner, 2026-11-28; Bingo's was 1).
 *                 Every target floor and `--sk-min-target` keep WCAG 2.5.8's 24 px (K33). A kit floor lower
 *                 than today, a CSS value differing from `FIT_FLOORS`, or a default (no game
 *                 named) below any game fails here. Every scaled `font-size` of the kit's
 *                 stylesheets must be floored by a floor variable or by no less than the
 *                 strictest text floor.
 * Depends on:     vitest, node:fs, ../src/fit
 * Source:         seasonal-mini-games apps/web/src/round/useFit.ts (FIT_FLOOR) and its CSS at
 *                 866df03; seasonal-bingo-royale apps/web/src/minTextSize.test.ts at a43209a
 */
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FIT_FLOORS, MIN_POINTER_TARGET, type FitFloors, type FitGame } from '../src/fit.js';

// Mini Games' badge: its round bar's unread count, 0.75rem (apps/web/src/round/focus.css).
// The scale floors are the owner's one floor of 2026-11-28, which lowered Bingo's on purpose.
const TODAY: Readonly<Record<FitGame, FitFloors>> = {
  'mini-games': { scale: 0.6, text: 13, display: 24, row: 22, target: 40, badge: 12 },
  bingo: { scale: 0.6, text: 14, display: 24, row: 22, target: 44, badge: 14 },
  // Seasonal Party: 14 px (owner, 2026-11-21), the strictest set otherwise (spirits
  // ResultCard.tsx at e907de9).
  'seasonal-party': { scale: 0.6, text: 14, display: 24, row: 22, target: 44, badge: 14 },
  // Cases: pending/fit-cases.css 14/24/22/44 (cc75504).
  cases: { scale: 0.6, text: 14, display: 24, row: 22, target: 44, badge: 14 },
};

const KINDS = ['text', 'display', 'row', 'target', 'badge'] as const;
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

  it('has one scale floor for every game, 0.6', () => {
    expect(Object.values(FIT_FLOORS).map((f) => f.scale)).toEqual([0.6, 0.6, 0.6, 0.6]);
  });

  it.each(Object.keys(FIT_FLOORS) as FitGame[])('writes the floors of %s into fit.css', (game) => {
    const floors = FIT_FLOORS[game];
    expect(floorsOf(`[data-sk-game='${game}']`)).toEqual({
      text: floors.text,
      display: floors.display,
      row: floors.row,
      target: floors.target,
      badge: floors.badge,
    });
  });

  it('defaults to the strictest floor of all games', () => {
    const root = floorsOf(':root');
    for (const kind of KINDS) {
      const strictest = Math.max(...Object.values(FIT_FLOORS).map((f) => f[kind]));
      expect(root[kind]).toBe(strictest);
    }
  });

  it('floors every scaled text size of the kit with a floor variable or ≥ the strictest', () => {
    const strictText = Math.max(...Object.values(FIT_FLOORS).map((f) => f.text));
    const sheets = readdirSync(dir).filter((f) => f.endsWith('.css'));
    const low = sheets.flatMap((file) =>
      [
        ...readFileSync(new URL(file, dir), 'utf8').matchAll(
          /font-size:\s*max\(\s*([^,]+),\s*calc\(var\(--fit/g,
        ),
      ]
        .map((m) => (m[1] ?? '').trim())
        .filter((first) => !first.startsWith('var(--sk-floor-'))
        .filter((first) => Number.parseFloat(first) < strictText)
        .map((first) => `${file}: ${first}`),
    );
    expect(low).toEqual([]);
  });

  it('keeps every pointer target at 24 px or more, in fit.css too (WCAG 2.5.8, K33)', () => {
    expect(MIN_POINTER_TARGET).toBe(24);
    const inCss = /--sk-min-target:\s*([\d.]+)px/.exec(css)?.[1];
    expect(Number(inCss)).toBe(MIN_POINTER_TARGET);
    for (const floors of Object.values(FIT_FLOORS)) {
      expect(floors.target).toBeGreaterThanOrEqual(MIN_POINTER_TARGET);
    }
  });
});
