/**
 * @file   src/react/theme.tsx
 * @brief  React over the kit's theme logic: the page's theme with its toggle, the theme shown,
 *         and the light/dark toggle button.
 *
 * Responsibility: `useTheme` starts from the early script's resolution, sets it on <html>,
 *                 follows the system setting while nothing is stored, and stores a click's
 *                 choice. `useShownTheme` follows <html data-theme> for parts that must match the
 *                 page (the website's chat frame). `ThemeToggle` is the round glass button with a
 *                 stroke icon, a moon in light mode and a sun in dark mode, in currentColor. Its
 *                 accessible name says what a click does ("Switch to dark theme"); the icon is
 *                 aria-hidden. Its look is ../../css/shell.css `sk-theme-toggle`; where it sits in
 *                 the bar stays the game's.
 * Source:         seasonal-mini-games apps/web/src/shell/theme.ts and ThemeToggle.tsx at 866df03;
 *                 seasonal-bingo-royale apps/web/src/shell/ThemeToggle.tsx at a43209a is the same
 *                 component. Built on ../theme (reused: resolveTheme, storeTheme, applyTheme,
 *                 onSystemThemeChange, shownTheme, onShownThemeChange).
 * Spec:           Seasonal Entertainment docs/DESIGN.md "Theme logic", "Icons"
 */
import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react';

import {
  applyTheme,
  onShownThemeChange,
  onSystemThemeChange,
  resolveTheme,
  shownTheme,
  storeTheme,
  type Theme,
} from '../theme.js';

export function useTheme(): { readonly theme: Theme; readonly toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  // The system setting is followed live while no choice is stored.
  useEffect(() => onSystemThemeChange(setTheme), []);
  const toggle = (): void => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    storeTheme(next);
    setTheme(next);
  };
  return { theme, toggle };
}

export function useShownTheme(): Theme | 'auto' {
  return useSyncExternalStore(onShownThemeChange, shownTheme);
}

const SUN =
  'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z';

export function ThemeToggle(): ReactElement {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="sk-theme-toggle"
      data-testid="theme-toggle"
      data-theme-now={theme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={toggle}
    >
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d={SUN} />
          </>
        ) : (
          <path d={MOON} />
        )}
      </svg>
    </button>
  );
}
