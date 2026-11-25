// @vitest-environment jsdom
/**
 * @file   src/react/headerFold.test.tsx
 * @brief  The app header folds whenever its items do not fit on one row (Bingo R1, v0.11.0).
 *
 * Responsibility: with the boxes of a one-row bar the header stays unfolded at any width; with
 *                 a second row (the toggle starting below the brand's bottom: an admin's long
 *                 bar, the back link in website mode) it folds before the paint and says so in
 *                 `data-sk-folded`. A new close key tries one row again. The answer depends only
 *                 on the width and the items (v0.27.0): a fresh mount equals a wide mount resized
 *                 to the same width; a header that changes size checks again, once per change,
 *                 and so do web fonts that load; a check that ends folded keeps an open menu, and
 *                 unfolding closes it. jsdom has no layout, so each element's box is stubbed: one
 *                 row is 40 px high from the top, and the header's own height is a variable.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader, type AppHeaderProps } from './AppHeader.js';

// Whether the stubbed layout puts the theme toggle on a second row.
let secondRow = false;
let resized: (() => void) | null = null;
// The header's own height, and the boxes measured so far.
let height = 40;
let measured = 0;
// The font set: `ready` resolves when the test says so.
let fonts = new EventTarget();
let fontsReady = (): void => undefined;

beforeEach(() => {
  secondRow = false;
  height = 40;
  measured = 0;
  const ready = new Promise<void>((resolve) => {
    fontsReady = resolve;
  });
  fonts = Object.assign(new EventTarget(), { ready });
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    measured += 1;
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
  Reflect.deleteProperty(document, 'fonts');
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

  it('keeps an open menu through a check that ends folded', () => {
    secondRow = true;
    render(<AppHeader {...admin} />);
    const menu = screen.getByTestId('menu-button');
    fireEvent.click(menu);
    act(() => {
      fonts.dispatchEvent(new Event('loadingdone'));
    });
    expect(folded()).toBe('true');
    expect(menu.getAttribute('aria-expanded')).toBe('true');
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

describe('the fold from the width and the items alone (v0.27.0, K79)', () => {
  it('decides again at every new width, whatever it decided before', () => {
    widen(1280);
    secondRow = true;
    render(<AppHeader {...admin} />);
    secondRow = false;
    act(() => {
      widen(1200);
    });
    expect(folded()).toBe('false');
    secondRow = true;
    act(() => {
      widen(1100);
    });
    expect(folded()).toBe('true');
  });

  it.each([1100, 1536])(
    'gives a fresh mount at %i px and a wide mount resized to it the same answer',
    (width) => {
      // The items need 1200 px, whatever the page did before.
      const at = (to: number): void => {
        secondRow = to < 1200;
        widen(to);
      };
      at(width);
      render(<AppHeader {...admin} />);
      const fresh = folded();
      cleanup();
      for (const first of [1920, 800]) {
        at(first);
        render(<AppHeader {...admin} />);
        act(() => {
          at(width);
        });
        expect(folded()).toBe(fresh);
        cleanup();
      }
      expect(fresh).toBe(String(width < 1200));
    },
  );
});

describe('a folded header measured again (v0.27.0, K79)', () => {
  it('checks again when the header changes size (a larger font, a late stylesheet)', () => {
    render(<AppHeader {...admin} />);
    secondRow = true;
    height = 90;
    act(() => resized?.());
    expect(folded()).toBe('true');
    secondRow = false;
    height = 40;
    act(() => resized?.());
    expect(folded()).toBe('false');
  });

  it('measures a folded header once per change, and not for its own fold', () => {
    secondRow = true;
    render(<AppHeader {...admin} />);
    const after = measured;
    act(() => resized?.());
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    expect(measured).toBe(after);
    height = 90;
    act(() => resized?.());
    const retried = measured;
    expect(retried).toBeGreaterThan(after);
    act(() => resized?.());
    expect(measured).toBe(retried);
    expect(folded()).toBe('true');
  });

  it.each([
    [
      'are ready',
      (): void => {
        fontsReady();
      },
    ],
    ['finish loading later', (): void => void fonts.dispatchEvent(new Event('loadingdone'))],
  ])('tries one row again when the web fonts %s', async (_, loaded) => {
    secondRow = true;
    render(<AppHeader {...admin} />);
    expect(folded()).toBe('true');
    secondRow = false;
    await act(() => {
      loaded();
      return Promise.resolve();
    });
    expect(folded()).toBe('false');
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
