/**
 * @file   tests/focus-and-targets.test.ts
 * @brief  The kit's CSS keeps the keyboard and touch rules of v0.10.0 (DECISIONS K29).
 *
 * Responsibility: the stylesheets the browser test cannot pin one by one:
 *                 - css/header.css sets no `order`, so what is shown is the DOM's order and the
 *                   tab order follows it (WCAG 2.4.3);
 *                 - css/shell.css draws one focus ring, `--sk-focus-ring`, on every control the
 *                   kit draws, for keyboard focus (WCAG 2.4.7); its colour's contrast is
 *                   tests/contrast.test.ts's;
 *                 - the bar's buttons and the back link are 44 px targets (WCAG 2.5.5 level AAA,
 *                   the kit's aim);
 *                 - the phase strip's parts wrap, so nothing scrolls sideways at 320 px
 *                   (WCAG 1.4.10; the showcase checks the page at 320 px).
 *                 Audit 2026-11-22, B7.
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const sheet = (name: string): string =>
  readFileSync(new URL(`../css/${name}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// The declarations of the first rule whose selector is exactly `selector`.
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`No rule ${selector}`);
  return css.slice(at, css.indexOf('}', at));
}

describe('the tab order in the header', () => {
  it('follows the order shown: header.css reorders nothing', () => {
    expect(sheet('header.css')).not.toMatch(/\border\s*:/);
  });
});

describe('the kit’s focus ring', () => {
  const shell = sheet('shell.css');

  it('is the text colour, defined once as --sk-focus-ring', () => {
    expect(rule(shell, ':root')).toMatch(/--sk-focus-ring:\s*var\(--sk-color-text\)/);
  });

  it.each([
    '.sk-back-link',
    '.sk-theme-toggle',
    '.sk-bar-button',
    '.sk-header-brand',
    '.sk-header-nav a',
    '.sk-header-chip',
    '.sk-chat-bar',
    '.sk-chat-dock-close',
  ])('rings %s on keyboard focus, outside the control', (control) => {
    const ring = /:where\(([^)]*)\):focus-visible\s*\{([^}]*)\}/.exec(shell);
    const controls = (ring?.[1] ?? '').split(',').map((s) => s.trim());
    expect(controls).toContain(control);
    expect(ring?.[2]).toMatch(/outline:\s*2px solid var\(--sk-focus-ring\)/);
    expect(ring?.[2]).toMatch(/outline-offset:\s*2px/);
  });
});

describe('the targets', () => {
  it('makes the bar’s buttons 44 px wide and high on every screen', () => {
    const button = rule(sheet('bar.css'), '.sk-bar-button');
    expect(button).toMatch(/min-width:\s*var\(--sk-hit-target\)/);
    expect(button).toMatch(/min-height:\s*var\(--sk-hit-target\)/);
  });

  it('makes the back link 44 px high', () => {
    expect(rule(sheet('shell.css'), '.sk-back-link')).toMatch(
      /min-height:\s*var\(--sk-hit-target\)/,
    );
  });

  it('keeps the hit target at 44 px', () => {
    expect(rule(sheet('tokens.css'), ':root')).toMatch(/--sk-hit-target:\s*44px/);
  });
});

describe('the phase strip at 320 px', () => {
  it('wraps its parts instead of scrolling sideways', () => {
    expect(rule(sheet('bar.css'), '.sk-phases')).toMatch(/flex-wrap:\s*wrap/);
  });
});
