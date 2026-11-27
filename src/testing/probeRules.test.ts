// @vitest-environment jsdom
/**
 * @file   src/testing/probeRules.test.ts
 * @brief  The probe's rules of v0.36.0 on a page whose boxes are given by attributes: boxes past
 *         the top and bottom, overlapping controls, the kit's own ellipsis and dense lists.
 *
 * Responsibility: a box across the page's top is reported, one across the bottom only where
 *                 nothing scrolls to it, one wholly outside or inside a scrolling box never; a
 *                 control lying over a part in the page's flow is reported, but not over a box
 *                 placed out of it, an inline one, or one it only touches; the chat bar's newest
 *                 message may end in an ellipsis and nothing else may; a link or a button in `.sk-dense-list`
 *                 passes at 24 px with 4 px clear, not at 23, not crowded, not outside the list,
 *                 and a field does not.
 * Depends on:     vitest, jsdom
 * Source:         new in the kit.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runProbe, type Probe } from './probe.js';

// `data-box="left top width height"` is an element's layout; without it, off to the side.
const boxOf = (el: Element): DOMRect => {
  const [x = 0, y = 0, w = 0, h = 0] = (el.getAttribute('data-box') ?? '')
    .split(' ')
    .filter(Boolean)
    .map(Number);
  return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h } as DOMRect;
};
// The page is 400 x 100; `data-page-height` says how much it scrolls.
const sizes: Record<string, (el: Element) => number> = {
  clientWidth: (el) => (el === document.documentElement ? 400 : 100),
  clientHeight: () => 100,
  scrollWidth: (el) => Number(el.getAttribute('data-scrollwidth') ?? 100),
  scrollHeight: (el) => Number(el.getAttribute('data-page-height') ?? 100),
};

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function box(this: Element) {
    return boxOf(this);
  };
  Element.prototype.checkVisibility = () => true;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  for (const [name, get] of Object.entries(sizes)) {
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      get(this: Element) {
        return get(this);
      },
    });
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-page-height');
});

const look = (html: string): Probe => {
  document.body.innerHTML = html;
  return runProbe(44);
};

describe('boxes past the top and bottom', () => {
  const page =
    '<i class="top" data-box="0 -18 40 44"></i><i class="low" data-box="0 80 40 44"></i>' +
    '<i class="away" data-box="0 -200 40 44"></i>' +
    '<div style="overflow: auto" data-box="0 0 90 90"><i data-box="0 -30 40 60"></i></div>';

  it('reports both on a page that does not scroll', () => {
    expect(look(page).outside).toEqual(['i.top y -18..26', 'i.low y 80..124']);
  });

  it('lets a scrolling page reach below, but never above', () => {
    document.documentElement.setAttribute('data-page-height', '500');
    expect(look(page).outside).toEqual(['i.top y -18..26']);
    const fixed = '<i class="f" style="position: fixed" data-box="0 80 40 44"></i>';
    expect(look(fixed).outside).toEqual(['i.f y 80..124']);
  });
});

describe('overlapping controls', () => {
  const button = '<button data-box="0 0 50 50">b</button>';

  it('reports a control over a part beside it, or beside a box around it', () => {
    const over = look(`<div data-box="0 0 90 90">${button}<p data-box="0 40 90 40"></p></div>`);
    expect(over.overlaps).toEqual(['button "b" over p']);
    const around = look(
      `<div data-box="0 0 90 40">${button}</div><section data-box="0 40 90 40"></section>`,
    );
    expect(around.overlaps).toEqual(['button "b" over section']);
  });

  it.each([
    '<p style="position: absolute" data-box="0 0 90 90"></p>',
    '<span style="display: inline" data-box="0 0 90 90"></span>',
    '<p data-box="0 48 90 40"></p>',
  ])('leaves a control beside %s', (other) => {
    expect(look(`${button}${other}`).overlaps).toEqual([]);
  });

  it('says nothing of a control in a menu placed over the page', () => {
    const menu = `<div style="position: absolute" data-box="0 0 90 90">${button}</div>`;
    expect(look(`${menu}<p data-box="0 0 90 90"></p>`).overlaps).toEqual([]);
  });
});

describe('the kit’s own ellipsis', () => {
  const ellipsis = (name: string): string =>
    `<span class="${name}" style="text-overflow: ellipsis" data-box="0 0 50 20" data-scrollwidth="300"><b data-box="0 0 50 20">m</b>x</span>`;

  it('is the chat bar’s newest message and nothing else', () => {
    Range.prototype.getClientRects = () => [{ width: 20, height: 10 }] as unknown as DOMRectList;
    const seen = look(ellipsis('sk-chat-bar-newest') + ellipsis('mine'));
    expect(seen.cut).toEqual(['span.mine "mx"']);
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  });
});

describe('a dense list', () => {
  const link = (y: number, height = 24): string =>
    `<li><a href="#p" style="display: block" data-box="0 ${String(y)} 80 ${String(height)}">p</a></li>`;
  const small = (html: string): number => look(html).smallTargets.length;

  it('passes links of 24 px with 4 px between them, there only', () => {
    const rows = `${link(0)}${link(28)}`;
    expect(small(`<ol class="sk-dense-list">${rows}</ol>`)).toBe(0);
    expect(small(`<ol>${rows}</ol>`)).toBe(2);
  });

  it('passes a button of 24 px there, and reports it outside such a list', () => {
    const button = '<li><button data-box="0 0 80 24">b</button></li>';
    expect(small(`<ol class="sk-dense-list">${button}</ol>`)).toBe(0);
    expect(look(`<ol>${button}</ol>`).smallTargets).toEqual(['button "b" 80x24']);
  });

  it('counts no neighbour that is scrolled out of view', () => {
    // A box 24 px high shows the first link; the next lies 2 px under it, scrolled away.
    const scrolled = `<div style="overflow: auto" data-box="0 0 90 24"><ol class="sk-dense-list">${link(0)}${link(26)}</ol></div>`;
    expect(look(scrolled).smallTargets).toEqual([]);
    // Both in sight, the same 2 px between them are too little for each.
    expect(small(`<ol class="sk-dense-list">${link(0)}${link(26)}</ol>`)).toBe(2);
  });

  it('counts no neighbour below the window while the link is in it', () => {
    // The window is 100 px high.
    expect(look(`<ol class="sk-dense-list">${link(76)}${link(101)}</ol>`).smallTargets).toEqual([]);
  });

  it.each([
    ['a link under 24 px', link(0, 23)],
    ['links with no room between them', `${link(0)}${link(25)}`],
    ['a button under 24 px', '<button data-box="0 0 80 23">b</button>'],
    ['a field', '<input data-box="0 0 80 24">'],
  ])('does not pass %s', (_what, rows) => {
    expect(small(`<ol class="sk-dense-list">${rows}</ol>`)).toBeGreaterThan(0);
  });
});
