// @vitest-environment jsdom
/**
 * @file   src/theme.test.ts
 * @brief  The theme logic: early script and module agree; storing; the system is followed only
 *         while nothing is stored; the shown theme is observed.
 *
 * Responsibility: the website's rule as Mini Games' theme.test.tsx checks it (seasonal-mini-games
 *                 apps/web/src/shell/theme.test.tsx at 93ed780), without React: a stored choice
 *                 wins, else the system setting; junk and blocked storage fall back to the system;
 *                 ../browser/theme-init.js, run as the browser runs it, sets the same theme.
 */
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyTheme,
  onShownThemeChange,
  onSystemThemeChange,
  resolveTheme,
  shownTheme,
  storedTheme,
  storeTheme,
} from './theme.js';

// Relative to the repository root, Vitest's root (jsdom's URL is not one node:fs accepts).
const EARLY = readFileSync('browser/theme-init.js', 'utf8');

let systemDark = false;
let listeners: (() => void)[] = [];

function system(dark: boolean): void {
  systemDark = dark;
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemDark;
    },
    addEventListener: (_type: string, l: () => void) => listeners.push(l),
    removeEventListener: (_type: string, l: () => void) => {
      listeners = listeners.filter((x) => x !== l);
    },
  }));
}

// The system setting flips and the browser tells every listener.
function systemTurns(dark: boolean): void {
  systemDark = dark;
  for (const l of listeners) l();
}

// The theme the early script sets on <html>, run as the browser runs it before the first paint.
function early(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  (new Function(EARLY) as () => void)();
  return document.documentElement.getAttribute('data-theme');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  listeners = [];
  document.documentElement.removeAttribute('data-theme');
});

describe('theme resolution', () => {
  it.each([
    ['stored dark, light system', 'dark', false, 'dark'],
    ['stored light, dark system', 'light', true, 'light'],
    ['nothing stored, dark system', null, true, 'dark'],
    ['nothing stored, light system', null, false, 'light'],
    ['junk stored, dark system', 'blue', true, 'dark'],
  ])('%s: early script and module agree', (_name, stored, dark, expected) => {
    system(dark);
    if (stored !== null) window.localStorage.setItem('se.theme', stored);
    expect(early()).toBe(expected);
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
    expect(early()).toBe('dark');
    expect(resolveTheme()).toBe('dark');
    expect(() => {
      storeTheme('light');
    }).not.toThrow();
  });
});

describe('storing and applying', () => {
  it("stores a choice under the website's key and sets it on <html>", () => {
    system(true);
    storeTheme('light');
    expect(window.localStorage.getItem('se.theme')).toBe('light');
    expect(storedTheme()).toBe('light');
    applyTheme(resolveTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('the system setting', () => {
  it('is followed while nothing is stored, ignored once a choice is, and unsubscribed', () => {
    system(false);
    const seen: string[] = [];
    const stop = onSystemThemeChange((t) => seen.push(t));
    systemTurns(true);
    expect(seen).toEqual(['dark']);
    storeTheme('light');
    systemTurns(false);
    expect(seen).toEqual(['dark']);
    stop();
    expect(listeners).toEqual([]);
  });
});

describe('the shown theme', () => {
  it("is 'auto' until set, then what <html data-theme> says, and its changes are told", async () => {
    expect(shownTheme()).toBe('auto');
    let changes = 0;
    const stop = onShownThemeChange(() => (changes += 1));
    applyTheme('dark');
    // MutationObserver reports after the current task.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(shownTheme()).toBe('dark');
    expect(changes).toBe(1);
    stop();
    applyTheme('light');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(changes).toBe(1);
  });
});
