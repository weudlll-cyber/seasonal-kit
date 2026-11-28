/**
 * @file   tests/call-css.test.ts
 * @brief  css/call.css applies the same sizes as `CALL_SLOT` (src/callSlot.ts), the website's
 *         contract.
 *
 * Responsibility: a game that sizes the slot by its classes and one that reads `callSlot`
 *                 get the same box. Each rule's width and height are read from the file and
 *                 compared with the constants, as is the low window's media query. The
 *                 modifiers must come after that query so that they win over it, and `hidden`
 *                 must take the slot out of the layout.
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CALL_SLOT } from '../src/callSlot.js';

const css = readFileSync(new URL('../css/call.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

// The declarations of the first rule for `selector` after `from` in the file.
function rule(selector: string, from = 0): Record<string, string> {
  const at = css.indexOf(`${selector} {`, from);
  if (at < 0) throw new Error(`no rule ${selector}`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries(
    body
      .split(';')
      .map((d) => d.split(':').map((s) => s.trim()))
      .filter((d): d is [string, string] => d.length === 2 && d[0] !== ''),
  );
}

const px = (n: number): string => `${String(n)}px`;
const query = `@media (max-height: ${px(CALL_SLOT.lowBelow - 1)})`;

describe('call.css', () => {
  it('is 338 × 190 by default', () => {
    expect(rule('.sk-call-slot')).toMatchObject({
      width: px(CALL_SLOT.width),
      height: px(CALL_SLOT.height),
    });
  });

  it('is 267 × 100 in a window under 760 px high, its frame in the view’s one-row form', () => {
    const at = css.indexOf(query);
    expect(at).toBeGreaterThan(-1);
    const low = rule('.sk-call-slot', at);
    expect(low).toMatchObject({
      width: px(CALL_SLOT.lowWidth),
      height: px(CALL_SLOT.lowHeight),
    });
    // The website's view draws its strip only in a frame under two bars high.
    const frame = CALL_SLOT.lowHeight - 2 * Number.parseInt(low['padding-block'] ?? '0', 10);
    expect(frame).toBeLessThan(2 * CALL_SLOT.bar);
    expect(frame).toBeLessThan(CALL_SLOT.lowWidth);
  });

  it('collapses to the 48 px column and the 48 px phone strip, after the query', () => {
    expect(rule('.sk-call-slot--collapsed')).toEqual({ width: px(CALL_SLOT.bar) });
    expect(rule('.sk-call-slot--strip')).toEqual({
      width: '100%',
      height: px(CALL_SLOT.bar),
      'padding-block': '0',
    });
    expect(rule('.sk-call-slot--phone')).toMatchObject({
      width: '100%',
      'aspect-ratio': '16 / 9',
      'padding-block': '0',
    });
    for (const modifier of ['--collapsed', '--strip', '--phone']) {
      expect(css.indexOf(`.sk-call-slot${modifier} {`)).toBeGreaterThan(css.indexOf(query));
    }
  });

  it('gives a slot left collapsed in a low window the low width', () => {
    const base = css.indexOf('.sk-call-slot--collapsed {');
    const low = css.indexOf(query, base);
    expect(low).toBeGreaterThan(base);
    expect(rule('.sk-call-slot--collapsed', low)).toEqual({ width: px(CALL_SLOT.lowWidth) });
  });

  it('takes no room while hidden', () => {
    expect(rule('.sk-call-slot[hidden]')).toEqual({ display: 'none' });
  });
});
