/**
 * @file   src/react/theme.tsx
 * @brief  React over the kit's theme logic: the page's theme with its toggle, the theme shown,
 *         and the light/dark toggle button.
 *
 * Responsibility: `useTheme` takes the early script's resolution before the first paint (never
 *                 during a render, so it renders on a server since v0.10.1), sets it on <html>,
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
import { type ReactElement } from 'react';
import { type Theme } from '../theme.js';
export declare function useTheme(): {
    readonly theme: Theme;
    readonly toggle: () => void;
};
export declare function useShownTheme(): Theme | 'auto';
export declare function ThemeToggle(): ReactElement;
