/**
 * @file   tests/components.test.ts
 * @brief  The base components' rules in css/components.css (K78).
 *
 * Responsibility: the stylesheet is opt-in (every selector starts at a `.sk-` class, so no bare
 *                 element is styled); colours are the kit's tokens, never written out; buttons,
 *                 inputs and selects are 44 px targets; small texts keep the game's floor; the
 *                 disabled rule comes after the variants, so it wins; and the package exports it.
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');

// Every rule as its selector list and its declarations.
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: (m[1] ?? '').split(',').map((s) => s.trim()),
  body: m[2] ?? '',
}));

const bodiesOf = (selector: string): string =>
  rules
    .filter((r) => r.selectors.includes(selector))
    .map((r) => r.body)
    .join('');

describe('the base components', () => {
  it('styles nothing a game has not given a kit class', () => {
    const bare = rules.flatMap((r) => r.selectors).filter((s) => !s.startsWith('.sk-'));
    expect(bare).toEqual([]);
  });

  it('writes no colour out: light and dark come from the tokens', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\(/i);
    for (const used of css.matchAll(/var\((--[\w-]+)/g)) expect(used[1]).toMatch(/^--sk-/);
  });

  it.each(['.sk-btn', '.sk-input', '.sk-select'])('makes %s a 44 px target', (selector) => {
    expect(bodiesOf(selector)).toMatch(/min-height:\s*var\(--sk-hit-target\)/);
  });

  it.each(['.sk-field > span', '.sk-chip', '.sk-badge-live'])(
    'keeps the small text of %s at the floor or above',
    (selector) => {
      expect(bodiesOf(selector)).toMatch(/font-size:\s*max\(var\(--sk-floor-text\),/);
    },
  );

  it('lets the disabled look win over every variant', () => {
    const disabled = css.indexOf('.sk-btn:disabled');
    for (const variant of ['.sk-btn--primary {', '.sk-btn--danger {', '.sk-btn--big {']) {
      expect(css.indexOf(variant)).toBeGreaterThan(-1);
      expect(css.indexOf(variant)).toBeLessThan(disabled);
    }
    expect(bodiesOf('.sk-btn:disabled')).not.toMatch(/opacity/);
  });

  it('is exported by the package', () => {
    const exported = (JSON.parse(read('../package.json')) as { exports: Record<string, unknown> })
      .exports;
    expect(exported['./components.css']).toBe('./css/components.css');
  });
});
