// @vitest-environment jsdom
/**
 * @file   src/testing/probeText.test.ts
 * @brief  The probe names text set in none of the kit's four sizes.
 *
 * Responsibility: a heading at the browser's default 24 px is reported and the four sizes pass; a
 *                 fitted root's scaled and floored sizes pass there and nowhere else; the kit's own
 *                 parts, hidden and empty elements and SVG text are left out; a page without the
 *                 tokens is not judged. jsdom resolves no `var()` or `clamp()`, so the page's
 *                 styles are stated: the tokens as a browser has them 1280 px wide at 16 px.
 * Depends on:     vitest, jsdom
 * Source:         new in the kit.
 */
import type { Page } from '@playwright/test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { probe } from './probe.js';
import { BASE } from './probeBase.js';
import { TEXT } from './probeText.js';

const TOKENS: Record<string, string> = {
  '--sk-font-size-small': '14',
  '--sk-font-size-body': '16',
  '--sk-font-size-lead': '20',
  '--sk-font-size-title': '42.24',
  '--sk-floor-text': '14px',
  '--sk-floor-display': '24px',
};
let tokens = TOKENS;

// An element's size is its `data-px`, 16 without one; the measuring box takes its token's.
beforeAll(() => {
  for (const name of ['clientWidth', 'clientHeight']) {
    Object.defineProperty(document.documentElement, name, { configurable: true, value: 800 });
  }
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20 }) as DOMRect;
  Element.prototype.checkVisibility = function visible(this: Element) {
    return !this.hasAttribute('hidden');
  };
  Range.prototype.getClientRects = () =>
    [{ left: 0, top: 0, right: 50, bottom: 10, width: 50, height: 10 }] as unknown as DOMRectList;
  const real = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el: Element) => {
    const asked = /var\((--[\w-]+)\)/.exec((el as HTMLElement).style.fontSize)?.[1];
    const px = asked === undefined ? (el.getAttribute('data-px') ?? '16') : (tokens[asked] ?? '');
    const { overflowX, overflowY, textOverflow, position, display } = real(el);
    return {
      overflowX,
      overflowY,
      textOverflow,
      position,
      display,
      fontSize: `${px}px`,
      getPropertyValue: (name: string) => tokens[name] ?? '',
    } as CSSStyleDeclaration;
  };
});

beforeEach(() => {
  tokens = TOKENS;
});

const read = (html: string): string[] => {
  document.body.innerHTML = html;
  return TEXT.offScaleText(BASE);
};
const text = (px: string, extra = ''): string => `<p data-px="${px}" ${extra}>words</p>`;

describe('offScaleText', () => {
  it('names a heading at the browser’s default 24 px', () => {
    expect(read('<h2 data-px="24">Standings</h2>')).toEqual(['h2 "Standings" 24px']);
  });

  it('passes the four sizes, half a pixel apart too', () => {
    expect(read(['14', '16', '20', '42.24', '42', '16.4'].map((px) => text(px)).join(''))).toEqual(
      [],
    );
    expect(read(text('15'))).toEqual(['p "words" 15px']);
  });

  it('passes a fitted root’s scaled and floored sizes there, and nowhere else', () => {
    const fitted = (scale: string, inside: string): string =>
      `<section data-sk-fit-scale="${scale}">${inside}</section>`;
    // 0.8 of body is 12.8, floored to 14; 0.5 of title is 21.12, floored to the display's 24.
    expect(read(fitted('0.8', text('12.8') + text('33.8') + text('14')))).toEqual([]);
    expect(read(fitted('0.5', text('24') + text('14')))).toEqual([]);
    expect(read(text('12.8') + text('24'))).toHaveLength(2);
    // A root that is not scaled gets nothing more.
    expect(read(fitted('1', text('24')))).toEqual(['p "words" 24px']);
  });

  it('leaves out the kit’s own sizes, what is not seen, empty boxes and SVG text', () => {
    const left = [
      '<div class="sk-start-head"><h1 data-px="60">Title</h1></div>',
      '<div class="sk-result-head"><h2 data-px="22"><span data-px="22">Won</span></h2></div>',
      '<span class="sk-bar-badge" data-px="12">3</span>',
      text('9', 'hidden'),
      '<div data-px="9"></div>',
      '<svg><text data-px="9">axis</text></svg>',
    ];
    expect(read(left.join(''))).toEqual([]);
  });

  it('judges no page that does not set the tokens', () => {
    tokens = { ...TOKENS, '--sk-font-size-lead': '' };
    expect(read(text('9'))).toEqual([]);
  });

  it('is part of the probe as the page runs it', async () => {
    const page = {
      evaluate: (code: string) => Promise.resolve((0, eval)(code) as unknown),
    } as unknown as Page;
    document.body.innerHTML = '<h2 data-px="24">Standings</h2>';
    expect((await probe(page)).textSizes).toEqual(['h2 "Standings" 24px']);
  });
});
