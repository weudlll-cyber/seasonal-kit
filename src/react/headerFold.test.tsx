// @vitest-environment jsdom
/**
 * @file   src/react/headerFold.test.tsx
 * @brief  The app header folds whenever its items do not fit on one row (Bingo R1, v0.11.0).
 *
 * Responsibility: with the boxes of a one-row bar the header stays unfolded at any width; with
 *                 a second row (the toggle starting below the brand's bottom: an admin's long
 *                 bar, the back link in website mode) it folds before the paint and says so in
 *                 `data-sk-folded`. A new close key tries one row again; a window grown past the
 *                 width it folded at unfolds, and a smaller one keeps it folded; a header that
 *                 changes size checks again; unfolding closes an open menu. jsdom has no layout,
 *                 so each element's box is stubbed: one row is 40 px high from the top.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader, type AppHeaderProps } from './AppHeader.js';

// Whether the stubbed layout puts the theme toggle on a second row.
let secondRow = false;
let resized: (() => void) | null = null;

beforeEach(() => {
  secondRow = false;
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const low = secondRow && this.classList.contains('sk-theme-toggle');
    return new DOMRect(0, low ? 50 : 0, 40, 40);
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(changed: () => void) {
        resized = changed;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resized = null;
});

const admin: AppHeaderProps = {
  websiteMode: true,
  brand: { href: '#/', emblem: <span />, name: 'Seasonal Bingo Royale' },
  links: [
    { href: '#/', label: 'Play', active: true },
    { href: '#/host', label: 'Host a match', active: false },
    { href: '#/admin', label: 'Admin', active: false },
    { href: '#/leaderboard', label: 'Leaderboard', active: false },
  ],
  account: { name: 'Walter', role: 'website admin', href: '#/account', onSignOut: vi.fn() },
  signIn: { href: '#/sign-in' },
  closeKey: 'lobby',
};

const folded = (): string | undefined => screen.getByTestId('app-header').dataset['skFolded'];

const widen = (to: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: to, configurable: true });
  fireEvent(window, new Event('resize'));
};

describe('the header fold, measured (v0.11.0, Bingo R1)', () => {
  it('stays unfolded while its items take one row', () => {
    render(<AppHeader {...admin} />);
    expect(folded()).toBe('false');
  });

  it('folds before the paint when its items would take a second row', () => {
    secondRow = true;
    render(<AppHeader {...admin} />);
    expect(folded()).toBe('true');
  });

  it('tries one row again on a new close key, and folds again if it still does not fit', () => {
    secondRow = true;
    const { rerender } = render(<AppHeader {...admin} />);
    secondRow = false;
    rerender(<AppHeader {...admin} closeKey="host" />);
    expect(folded()).toBe('false');
    secondRow = true;
    rerender(<AppHeader {...admin} closeKey="admin" />);
    expect(folded()).toBe('true');
  });

  it('unfolds in a window grown past the width it folded at, not in a smaller one', () => {
    widen(1280);
    secondRow = true;
    render(<AppHeader {...admin} />);
    secondRow = false;
    act(() => {
      widen(1200);
    });
    expect(folded()).toBe('true');
    act(() => {
      widen(1600);
    });
    expect(folded()).toBe('false');
  });

  it('checks again when the header changes size (a larger font)', () => {
    render(<AppHeader {...admin} />);
    secondRow = true;
    act(() => resized?.());
    expect(folded()).toBe('true');
  });

  it('closes an open menu once the items fit in the bar again', () => {
    widen(1024);
    secondRow = true;
    render(<AppHeader {...admin} />);
    const menu = screen.getByTestId('menu-button');
    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    secondRow = false;
    act(() => {
      widen(1600);
    });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('always folding below a width (v0.13.0, Bingo)', () => {
  it('folds under the width though the items fit on one row, and not from it up', () => {
    widen(800);
    const { rerender } = render(<AppHeader {...admin} foldBelow={960} />);
    expect(folded()).toBe('true');
    act(() => {
      widen(1200);
    });
    expect(folded()).toBe('false');
    act(() => {
      widen(900);
    });
    expect(folded()).toBe('true');
    // Left out: the measure alone decides, so a one-row bar stays unfolded at 800 px.
    widen(800);
    rerender(<AppHeader {...admin} />);
    expect(folded()).toBe('false');
  });

  it('keeps the measured fold on top of it: past the width a second row still folds', () => {
    widen(1280);
    secondRow = true;
    render(<AppHeader {...admin} foldBelow={960} />);
    expect(folded()).toBe('true');
  });
});
