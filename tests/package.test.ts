/**
 * @file   tests/package.test.ts
 * @brief  The package's `sideEffects` keeps every stylesheet a game imports (v0.20.0, audit A-29).
 *
 * Responsibility: `"sideEffects": ["**\/*.css"]` tells a bundler that the kit's JavaScript has no
 *                 effect of its own, so it may drop what a game does not use, and that a
 *                 stylesheet always has one, so it keeps every `import '@seasonal/kit/*.css'`.
 *                 A bare `false` would let a bundler drop the CSS imports. The test pins the
 *                 field's exact value and that every CSS export is a `.css` file, so the one
 *                 pattern covers them. That a real bundle keeps the CSS is proved on each tag
 *                 (docs/DELIVERY.md).
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  sideEffects: unknown;
  exports: Record<string, string | { default: string }>;
};

describe('package.json sideEffects', () => {
  it('is exactly the stylesheets: JavaScript may be dropped, CSS never', () => {
    expect(pkg.sideEffects).toEqual(['**/*.css']);
  });

  it('covers every CSS export with that one pattern', () => {
    const css = Object.entries(pkg.exports).filter(([name]) => name.endsWith('.css'));
    expect(css.length).toBeGreaterThanOrEqual(10);
    for (const [name, target] of css) {
      expect(typeof target, name).toBe('string');
      expect(typeof target === 'string' && target.endsWith('.css'), name).toBe(true);
    }
  });
});

// Every source file a game's runtime can import: all of src/ but the testing entry.
const runtime = readdirSync(new URL('../src', import.meta.url), { recursive: true })
  .map((f) => String(f).split(path.sep).join('/'))
  .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.') && !f.startsWith('testing/'));
const source = (f: string): string => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('the testing entry (K66)', () => {
  it('is imported by nothing a game runs, so it never reaches a bundle', () => {
    expect(runtime.length).toBeGreaterThan(20);
    expect(runtime.filter((f) => /from '(\.\.?\/)+testing\//.test(source(f)))).toEqual([]);
  });

  it('imports Playwright as a type only: it is an optional peer', () => {
    const testing = readdirSync(new URL('../src/testing', import.meta.url)).filter(
      (f) => !f.includes('.test.'),
    );
    for (const f of testing) {
      expect(source(`testing/${f}`), f).not.toMatch(
        /^import (?!type)[^;]*'@(playwright|axe-core)/m,
      );
    }
  });
});
