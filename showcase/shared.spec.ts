/**
 * @file   showcase/shared.spec.ts
 * @brief  The shared call's slot in a real browser, against the stand-in website's view (K77).
 *
 * Responsibility: the dock of a website game frames `/embed/call/shared`: no room taken while
 *                 nothing is shared; a live call shows it at the right end of the chat strip on a
 *                 desktop and directly above the chat bar on a phone, with "Back to the call";
 *                 `unshared` and `ended` hide it and the view hears `visible: false`; the next
 *                 call shows in the same loaded frame; without `onSharedCall` nothing is framed.
 *                 The frame's page is the stand-in's own, served for the showcase's address.
 * Depends on:     @playwright/test, ../src/testing/standInFrames, ./screens
 * Source:         new in the kit.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "The shared call" at f8f2cdf
 */
import { expect, test, type Page } from '@playwright/test';

import { framePage } from '../src/testing/standInFrames.js';
import { settled } from './screens.js';

async function open(page: Page, width: number, height: number, query = ''): Promise<void> {
  await page.route('**/embed/call/shared?*', (route) =>
    route.fulfill({ contentType: 'text/html', body: framePage('call', null) }),
  );
  await page.setViewportSize({ width, height });
  await page.goto(`/?theme=light&screen=shared${query}`);
  await settled(page);
}

// The view says something, once its page is there.
async function says(page: Page, type: string, fields: object): Promise<void> {
  const frame = page.frameLocator('[data-testid="shared-call-frame"]');
  await frame.locator('p').waitFor({ state: 'attached' });
  await frame.locator('body').evaluate(
    (_body, [t, f]) => {
      (window as unknown as { say: (t: string, f: object) => void }).say(t, f);
    },
    [type, fields] as const,
  );
}

// What the view was told about being in sight, in order.
const sight = (page: Page): Promise<unknown[]> =>
  page
    .frameLocator('[data-testid="shared-call-frame"]')
    .locator('body')
    .evaluate(() =>
      (window as unknown as { received: { type: string; visible?: boolean }[] }).received
        .filter((m) => m.type === 'visible')
        .map((m) => m.visible),
    );

const ready = (call: number) => ({ call, status: 'live', signedIn: true });

const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).boundingBox();
  if (found === null) throw new Error(`not drawn: ${selector}`);
  return found;
};

const SIZES = [
  { width: 1536, height: 864, slot: [338, 190] },
  { width: 1280, height: 720, slot: [267, 100] },
  // A phone's strip takes the dock's width.
  { width: 390, height: 844, slot: [370, 48] },
] as const;

for (const { width, height, slot } of SIZES) {
  test(`the shared call's slot in the dock at ${String(width)} x ${String(height)}`, async ({
    page,
  }) => {
    await open(page, width, height);
    const shared = page.getByTestId('shared-call-slot');
    await expect(shared).toBeHidden();
    await expect(page.getByTestId('back-to-call')).toHaveCount(0);

    await says(page, 'ready', ready(9));
    await expect(shared).toBeVisible();
    await expect(page.getByTestId('back-to-call')).toHaveAttribute('href', '/calls/9');
    await expect.poll(async () => (await sight(page)).at(-1)).toBe(true);
    const drawn = await box(page, '[data-testid="shared-call-slot"]');
    expect([Math.round(drawn.width), Math.round(drawn.height)]).toEqual(slot);
    if (height < 760 && width >= 900) {
      // The low strip's frame is under two bars high: the view's one-row form (K126).
      const frame = await box(page, '[data-testid="shared-call-frame"]');
      expect(Math.round(frame.height)).toBe(94);
    }
    if (width >= 900) {
      // At the strip's right end, the chat beside it.
      const chat = await box(page, '.sk-chat-dock-body');
      const row = await box(page, '.sk-chat-dock-row');
      expect(chat.x + chat.width).toBeLessThanOrEqual(drawn.x);
      expect(drawn.x + drawn.width).toBeCloseTo(row.x + row.width, 0);
    } else {
      const bar = await box(page, '[data-testid="chat-bar"]');
      expect(drawn.y + drawn.height).toBeLessThanOrEqual(bar.y + 0.5);
      expect(bar.y - drawn.y - drawn.height).toBeLessThan(16);
    }

    await says(page, 'ended', { reason: 'unshared' });
    await expect(shared).toBeHidden();
    await expect(page.getByTestId('back-to-call')).toHaveCount(0);
    await expect.poll(async () => (await sight(page)).at(-1)).toBe(false);

    // The next call, from the same loaded frame: it still holds what it heard before.
    await says(page, 'ready', ready(12));
    await expect(shared).toBeVisible();
    await expect(page.getByTestId('back-to-call')).toHaveAttribute('href', '/calls/12');
    await expect.poll(async () => (await sight(page)).at(-1)).toBe(true);
    expect(await sight(page)).toContain(false);
    await says(page, 'ended', { reason: 'ended' });
    await expect(shared).toBeHidden();
  });
}

test('a standalone game frames nothing of the shared call', async ({ page }) => {
  await open(page, 1280, 720, '&standalone=1');
  await expect(page.getByTestId('shared-call-slot')).toHaveCount(0);
  await expect(page.getByTestId('call-frame')).toHaveCount(0);
  await expect(page.getByTestId('back-to-call')).toHaveCount(0);
});
