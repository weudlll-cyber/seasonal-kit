/**
 * @file   showcase/screens.ts
 * @brief  Where the showcase's screens land, and the viewports and themes it is seen in.
 *
 * Responsibility: one list for the spec and the setup: the five viewports of the owner's
 *                 brief (three desktops, two phones), both themes, and showcase/screens/, which
 *                 is git-ignored and emptied before every run.
 * Source:         new in the kit.
 */
import { fileURLToPath } from 'node:url';

export const SCREENS = fileURLToPath(new URL('screens/', import.meta.url));

export const VIEWPORTS = [
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1536x768', width: 1536, height: 768 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'phone-375x667', width: 375, height: 667 },
  { name: 'phone-390x844', width: 390, height: 844 },
] as const;

export const THEMES = ['light', 'dark'] as const;

// The start card in the dock, then the result in it.
export const SCREENS_SHOWN = ['start', 'result'] as const;
