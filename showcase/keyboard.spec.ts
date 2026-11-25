/**
 * @file   showcase/keyboard.spec.ts
 * @brief  What axe cannot see: the keyboard alone reaches every control, with a visible focus and a
 *         name; focus comes back where it left; reduced motion is respected (night audit
 *         2026-11-25, piece 6).
 *
 * Responsibility: in a desktop and a phone window, Tab visits every visible control of the page
 *                 outside the chat frame, in the order the page lists them (no positive
 *                 `tabindex`), each with a focus ring the eye can see (an outline or a box shadow)
 *                 and an accessible name (text, `aria-label`, an image's `alt` or a title). The
 *                 folded header menu and the phone chat sheet give the focus back to the button
 *                 that opened them when Escape or Close shuts them. Under
 *                 `prefers-reduced-motion: reduce` the win glow and every transition are off,
 *                 and without it the glow runs, so the check can fail.
 * Depends on:     @playwright/test, ./screens
 * Source:         new in the kit.
 */
import { expect, test, type Page } from '@playwright/test';

import { settled } from './screens.js';

const CONTROLS =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Marks every visible control outside an iframe with an index, and says how many there are.
async function markControls(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    let n = 0;
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      const hidden =
        r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden';
      if (hidden || el.closest('[hidden], [aria-hidden="true"], iframe, .sk-visually-hidden'))
        continue;
      el.dataset['kb'] = String(n);
      n += 1;
    }
    return n;
  }, CONTROLS);
}

interface Stop {
  readonly kb: string | undefined;
  readonly name: string;
  readonly ring: boolean;
}

// The focused element now: its mark, its accessible name, and whether a focus ring shows.
function stopNow(page: Page): Promise<Stop> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el === null) return { kb: undefined, name: '', ring: false };
    const style = getComputedStyle(el);
    const alt = el.querySelector('img')?.getAttribute('alt') ?? '';
    const name = (
      el.getAttribute('aria-label') ??
      (el.textContent.trim() || alt || el.getAttribute('title') || '')
    ).trim();
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    return { kb: el.dataset['kb'], name, ring: outline || style.boxShadow !== 'none' };
  });
}

for (const [label, width, height] of [
  ['desktop', 1280, 720],
  ['phone', 390, 844],
] as const) {
  test(`the keyboard alone reaches every control at ${label} size, in order, seen and named`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?theme=light');
    await settled(page);
    const total = await markControls(page);
    expect(total).toBeGreaterThan(5);
    expect(await page.locator('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count()).toBe(
      0,
    );
    const reached: number[] = [];
    const seen: Stop[] = [];
    for (let i = 0; i < total * 3 + 20; i += 1) {
      await page.keyboard.press('Tab');
      const stop = await stopNow(page);
      if (stop.kb === undefined) continue;
      if (reached.length > 0 && stop.kb === String(reached[0]) && reached.length >= total - 1)
        break;
      reached.push(Number(stop.kb));
      seen.push(stop);
    }
    // Every control was a stop at least once.
    const missed = Array.from({ length: total }, (_, i) => i).filter((i) => !reached.includes(i));
    expect(missed, 'controls Tab never reached (their marks)').toEqual([]);
    // In the page's own order: the marks only go up, as the DOM lists them.
    const ups = reached.filter((n, i) => i === 0 || n > (reached[i - 1] ?? -1));
    expect(ups.length, 'Tab goes in DOM order').toBe(reached.length);
    expect(seen.filter((s) => s.name === '').length, 'every stop has a name').toBe(0);
    expect(seen.filter((s) => !s.ring).length, 'every stop shows a focus ring').toBe(0);
  });
}

test('the folded header menu gives the focus back to its button on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?theme=light');
  const button = page.getByTestId('menu-button').first();
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});

test('the phone chat sheet gives the focus back to the chat bar on Close and on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?theme=light');
  const bar = page.getByTestId('chat-bar');
  await bar.click();
  const sheet = page.getByRole('dialog', { name: 'Chat' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(bar).toBeFocused();
  await bar.click();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(bar).toBeFocused();
});

// The win glow and a button with a transition, added to the page as a game would have them.
async function motionOf(page: Page): Promise<{ animation: string; transition: string }> {
  return page.evaluate(() => {
    const glow = document.createElement('div');
    glow.className = 'sk-anim-win';
    const box = document.createElement('button');
    box.style.transition = 'opacity 300ms';
    document.body.append(glow, box);
    return {
      animation: getComputedStyle(glow).animationName,
      transition: getComputedStyle(box).transitionDuration,
    };
  });
}

test('the win glow runs, and under reduced motion it and every transition are off', async ({
  page,
  browser,
}) => {
  await page.goto('/?theme=light');
  expect((await motionOf(page)).animation, 'without the preference the glow runs').toBe('sk-glow');
  const calm = await browser.newPage({ reducedMotion: 'reduce' });
  await calm.goto('/?theme=light');
  const motion = await motionOf(calm);
  expect(motion.animation).toBe('none');
  expect(motion.transition).toBe('0s');
  await calm.close();
});
