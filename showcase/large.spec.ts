/**
 * @file   showcase/large.spec.ts
 * @brief  At 100 % and 200 % text no kit part cuts, hides or pushes text or a control out of the
 *         window or over other content (v0.36.0).
 *
 * Responsibility: on ./LargeText's screens, at the sweep's window sizes (`SWEEP_SIZES`, K128)
 *                 with a 16 and a 32 px root font:
 *                 - the game bar holds all its controls and facts, whole, above what follows it;
 *                 - the start card hides nothing: what does not fit can be scrolled to, by
 *                   keyboard too;
 *                 - a long result headline shows whole where the text is large;
 *                 - with the chat sheet open on a small phone no control lies partly under it;
 *                 - a panel's buttons keep their words inside, and the page does not scroll
 *                   sideways;
 *                 - the last row of a long screen ends above the phone's chat bar.
 *                 `SK_MEASURE=1` prints what it measured, for a before and after.
 * Depends on:     @playwright/test, ../src/testing/screens, ./screens, ./LargeText.tsx
 * Source:         new in the kit (the findings of Seasonal Cases, Mini Games and Bingo Royale at
 *                 v0.34.0).
 */
import { expect, test, type Page } from '@playwright/test';

import { SWEEP_SIZES } from '../src/testing/screens.js';
import { settled } from './screens.js';

const SIZES = SWEEP_SIZES.map(({ width, height }) => [width, height] as const);
const FONTS = [16, 32] as const;
type Size = (typeof SIZES)[number];

async function open(page: Page, screen: string, [width, height]: Size, font: number) {
  await page.setViewportSize({ width, height });
  await page.goto(`/?theme=light&screen=${screen}`);
  await page.addStyleTag({ content: `html { font-size: ${String(font)}px; }` });
  await settled(page);
}

const report = (what: string, seen: unknown): void => {
  if (process.env['SK_MEASURE'] === '1') {
    process.stdout.write(`MEASURE ${what} ${JSON.stringify(seen)}\n`);
  }
};

// The game bar: parts outside the bar or the window, facts cut short, the bar's height.
const bar = (page: Page) =>
  page.getByTestId('game-bar').evaluate((el) => {
    const box = el.getBoundingClientRect();
    const parts = [...el.querySelectorAll<HTMLElement>('.sk-bar-button, .sk-bar-fact')];
    const out = parts.filter((p) => {
      const r = p.getBoundingClientRect();
      return (
        r.width > 1 &&
        (r.top < box.top - 1 ||
          r.bottom > box.bottom + 1 ||
          r.left < -1 ||
          r.right > window.innerWidth + 1)
      );
    }).length;
    const cut = parts.filter((p) => {
      const r = p.getBoundingClientRect();
      return r.width > 1 && p.scrollWidth > p.clientWidth + 1;
    }).length;
    const under = document.querySelector('[data-testid="under-bar"]')?.getBoundingClientRect();
    return {
      height: Math.round(box.height),
      out,
      cut,
      over: Math.max(0, Math.round(box.bottom - (under?.top ?? box.bottom))),
      sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

// The start card: what lies above its top (never reachable), and what is hidden without a scroll.
const card = (page: Page) =>
  page.getByTestId('start-card').evaluate((el) => {
    el.scrollTop = 0;
    const box = el.getBoundingClientRect();
    const tops = [...el.querySelectorAll('*')].map((c) => c.getBoundingClientRect().top);
    const hidden = el.scrollHeight - el.clientHeight;
    const scrolls = /auto|scroll/.test(getComputedStyle(el).overflowY);
    return {
      above: Math.max(0, Math.round(box.top - Math.min(...tops))),
      hidden: Math.max(0, hidden),
      unreachable: scrolls ? 0 : Math.max(0, hidden),
      tabStop: el.tabIndex === 0,
    };
  });

// Buttons of the round the open sheet lies partly over.
const sheet = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.querySelector('.sk-chat-dock-body')?.getBoundingClientRect();
    const main = document.querySelector('.sk-docked-main')?.getBoundingClientRect();
    if (!dialog || !main) throw new Error('no sheet or screen');
    const covered = [...document.querySelectorAll('.sk-docked-main button')].filter((b) => {
      const r = b.getBoundingClientRect();
      const bottom = Math.min(r.bottom, main.bottom);
      const top = Math.max(r.top, main.top);
      return bottom - top > 1 && top < dialog.bottom - 1 && bottom > dialog.top + 1;
    }).length;
    return { covered, screen: Math.round(main.height), sheet: Math.round(dialog.height) };
  });

for (const [width, height] of SIZES) {
  for (const font of FONTS) {
    const at = `${String(width)}x${String(height)} ${String(font)}px`;

    test(`the game bar holds its parts: ${at}`, async ({ page }) => {
      await open(page, 'bar', [width, height], font);
      const seen = await bar(page);
      report(`bar ${at}`, seen);
      expect([seen.out, seen.cut, seen.over, seen.sideways]).toEqual([0, 0, 0, false]);
    });

    test(`the start card hides nothing: ${at}`, async ({ page }) => {
      await open(page, 'card', [width, height], font);
      const seen = await card(page);
      report(`card ${at}`, seen);
      expect([seen.above, seen.unreachable]).toEqual([0, 0]);
      // A box that scrolls is a Tab stop; one that does not adds none.
      expect(seen.tabStop).toBe(seen.hidden > 1);
    });

    test(`the panel and the headline keep their words: ${at}`, async ({ page }) => {
      await open(page, 'panel', [width, height], font);
      const seen = await page.evaluate(() => {
        const panel = document.querySelector('.sk-panel')?.getBoundingClientRect();
        const buttons = [...document.querySelectorAll<HTMLElement>('.sk-panel .sk-btn')];
        const head = document.querySelector<HTMLElement>('.sk-result-head h2');
        return {
          cutButtons: buttons.filter(
            (b) =>
              b.scrollWidth > b.clientWidth + 1 ||
              b.getBoundingClientRect().right > (panel?.right ?? 0) + 1,
          ).length,
          sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
          headlineCut: Math.max(0, (head?.scrollHeight ?? 0) - (head?.clientHeight ?? 0)),
        };
      });
      report(`panel ${at}`, seen);
      expect([seen.cutButtons, seen.sideways]).toEqual([0, false]);
      // At the default text a headline with room keeps its two lines, however long the sentence.
      if (font > 16) expect(seen.headlineCut).toBe(0);
    });
  }
}

for (const [width, height] of SIZES.filter(([w]) => w < 600)) {
  for (const font of FONTS) {
    const at = `${String(width)}x${String(height)} ${String(font)}px`;

    test(`no control lies partly under the open sheet: ${at}`, async ({ page }) => {
      await open(page, 'round', [width, height], font);
      await page.getByTestId('chat-bar').click();
      await settled(page);
      const seen = await sheet(page);
      report(`sheet ${at}`, seen);
      // A tall phone keeps the sheet over the screen, which Close or Escape gives back.
      if (height <= 640) expect(seen.covered).toBe(0);
    });

    test(`the last row ends above the chat bar: ${at}`, async ({ page }) => {
      await open(page, 'round', [width, height], font);
      const seen = await page.evaluate(() => {
        const main = document.querySelector('.sk-docked-main');
        const dock = document.querySelector('.sk-chat-dock')?.getBoundingClientRect();
        if (!main || !dock) throw new Error('no screen or dock');
        main.scrollTop = main.scrollHeight;
        const last = [...main.querySelectorAll('button')].at(-1)?.getBoundingClientRect();
        return { last: Math.round(last?.bottom ?? 0), bar: Math.round(dock.top) };
      });
      report(`lastrow ${at}`, seen);
      expect(seen.last).toBeLessThanOrEqual(seen.bar);
    });
  }
}
