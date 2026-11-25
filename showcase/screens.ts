/**
 * @file   showcase/screens.ts
 * @brief  Where the showcase's screens land, and the viewports and themes it is seen in.
 *
 * Responsibility: one list for the spec and the setup: the five viewports of the owner's
 *                 brief (three desktops, two phones), both themes, and showcase/screens/, which
 *                 is git-ignored and emptied before every run. `settled` waits until the web
 *                 fonts are in and the headers have been measured again with them (K79), so a
 *                 spec counts and measures the page as it stays.
 * Source:         new in the kit.
 */
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

export const SCREENS = fileURLToPath(new URL('screens/', import.meta.url));

export const VIEWPORTS = [
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1536x768', width: 1536, height: 768 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'phone-375x667', width: 375, height: 667 },
  { name: 'phone-390x844', width: 390, height: 844 },
] as const;

export const THEMES = ['light', 'dark'] as const;

// Fonts loaded, then two frames: the render that follows them and its paint.
export async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          done();
        });
      });
    });
  });
}

// The start card in the dock, then the result in it.
export const SCREENS_SHOWN = ['start', 'result'] as const;
