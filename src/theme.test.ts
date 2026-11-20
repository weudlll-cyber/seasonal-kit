// @vitest-environment jsdom
/**
 * @file   src/theme.test.ts
 * @brief  The theme logic: a stored choice wins, else the system setting; blocked storage.
 *
 * Responsibility: the website's rule as Mini Games' theme.test.tsx checks it (seasonal-mini-games
 *                 apps/web/src/shell/theme.test.tsx at 93ed780), without React.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveTheme, storeTheme } from './theme.js';

function system(dark: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches: dark }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('theme resolution', () => {
  it.each([
    ['stored dark, light system', 'dark', false, 'dark'],
    ['stored light, dark system', 'light', true, 'light'],
    ['nothing stored, dark system', null, true, 'dark'],
    ['nothing stored, light system', null, false, 'light'],
    ['junk stored, dark system', 'blue', true, 'dark'],
  ])('%s', (_name, stored, dark, expected) => {
    system(dark);
    if (stored !== null) window.localStorage.setItem('se.theme', stored);
    expect(resolveTheme()).toBe(expected);
  });

  it('follows the system setting when storage is blocked, and storing does not throw', () => {
    system(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(resolveTheme()).toBe('dark');
    expect(() => {
      storeTheme('light');
    }).not.toThrow();
  });
});
