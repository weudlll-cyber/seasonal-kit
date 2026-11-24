/**
 * @file   tests/result-shape-css.test.ts
 * @brief  css/frames.css lays the result out without a reveal in one column, and styles the
 *         middle card as the "more" card (v0.15.0).
 *
 * Responsibility: the rule for `data-sk-reveal='none'` has one column and the head and places
 *                 areas only, and comes after the desktop media block, so on a wide screen it
 *                 wins over the two-column rule (equal specificity, the later one). The middle
 *                 card shares the "more" card's rule, so both look alike. The two-column rule
 *                 for a result with a reveal is unchanged.
 * Depends on:     vitest, node:fs
 * Source:         docs/concepts/result-frame.md (points 1 and 2).
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../css/frames.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('the result without a reveal', () => {
  const rule = /\.sk-result\[data-sk-reveal='none'\] \.sk-result-first\s*\{([^}]*)\}/.exec(css);

  it('is one column of head and places', () => {
    expect(rule).not.toBeNull();
    const body = rule?.[1] ?? '';
    expect(body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(body).toMatch(/grid-template-areas:\s*'head' 'places';/);
  });

  it('comes after the desktop two-column rule, so it wins at equal specificity', () => {
    const desktop = css.indexOf('@media (min-width: 900px)');
    expect(desktop).toBeGreaterThan(-1);
    expect(css.indexOf("[data-sk-reveal='none']")).toBeGreaterThan(css.indexOf('\n}\n', desktop));
  });

  it('leaves the two-column rule of a result with a reveal as it was', () => {
    expect(css).toMatch(
      /@media \(min-width: 900px\)\s*\{\s*\.sk-result-first\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(20rem,\s*28rem\);/,
    );
  });
});

describe('the middle card', () => {
  it('is styled with the more card', () => {
    expect(css).toMatch(/\.sk-result-middle,\s*\.sk-result-more\s*\{[^}]*border-radius/);
  });
});
