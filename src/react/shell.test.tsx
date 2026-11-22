// @vitest-environment jsdom
/**
 * @file   src/react/shell.test.tsx
 * @brief  The shell's React parts: the theme and its toggle, the disclosure, the back link and
 *         the fit hook.
 *
 * Responsibility: the toggle says what a click does, flips, stores and sets <html data-theme>;
 *                 the system is followed while nothing is stored; the shown theme follows
 *                 <html>. The disclosure opens, closes on Escape only while open and gives the
 *                 focus back; `dismiss` closes and leaves the focus. The back link shows only in website mode and leads to /games. The
 *                 fit hook sets `--fit` on its element and stops on unmount.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackLink } from './BackLink.js';
import { ThemeToggle, useShownTheme, useTheme } from './theme.js';
import { useDisclosure } from './useDisclosure.js';
import { useFitScale } from './useFitScale.js';

let systemDark = false;
let systemChanged: (() => void) | null = null;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemDark;
    },
    addEventListener: (_: string, cb: () => void) => {
      systemChanged = cb;
    },
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  systemDark = false;
});

describe('the theme toggle', () => {
  it('says what a click does, flips, stores and sets <html data-theme>', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(document.documentElement.dataset['theme']).toBe('light');
    fireEvent.click(button);
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(window.localStorage.getItem('se.theme')).toBe('dark');
    expect(button.querySelector('circle')).not.toBeNull();
    fireEvent.click(button);
    expect(window.localStorage.getItem('se.theme')).toBe('light');
  });

  it('follows the system while nothing is stored', () => {
    const { result } = renderHook(() => useTheme());
    systemDark = true;
    act(() => systemChanged?.());
    expect(result.current.theme).toBe('dark');
  });

  it('shows the theme <html> has', async () => {
    const { result } = renderHook(() => useShownTheme());
    expect(result.current).toBe('auto');
    document.documentElement.setAttribute('data-theme', 'dark');
    await act(() => Promise.resolve());
    expect(result.current).toBe('dark');
  });
});

describe('the disclosure', () => {
  it('keeps toggle and close the same across renders (audit B4)', () => {
    const { result, rerender } = renderHook(() => useDisclosure());
    const { toggle, close, dismiss } = result.current;
    act(() => {
      toggle();
    });
    rerender();
    expect(result.current.open).toBe(true);
    expect(result.current.toggle).toBe(toggle);
    expect(result.current.close).toBe(close);
    expect(result.current.dismiss).toBe(dismiss);
  });

  it('dismisses: closes and leaves the focus where it is (v0.10.1)', () => {
    const { result } = renderHook(() => useDisclosure(true));
    const button = document.createElement('button');
    const elsewhere = document.createElement('button');
    document.body.append(button, elsewhere);
    result.current.button.current = button;
    elsewhere.focus();
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.open).toBe(false);
    expect(document.activeElement).toBe(elsewhere);
    button.remove();
    elsewhere.remove();
  });

  it('opens, closes on Escape only while open, and gives the focus back', () => {
    const { result } = renderHook(() => useDisclosure());
    const button = document.createElement('button');
    document.body.append(button);
    result.current.button.current = button;
    const escape = { key: 'Escape', stopPropagation: vi.fn() } as never;
    act(() => {
      result.current.onKeyDown(escape);
    });
    expect(result.current.open).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.open).toBe(true);
    act(() => {
      result.current.onKeyDown({ key: 'a', stopPropagation: vi.fn() } as never);
    });
    expect(result.current.open).toBe(true);
    act(() => {
      result.current.onKeyDown(escape);
    });
    expect(result.current.open).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(result.current.panelId).not.toBe('');
  });
});

describe('the back link', () => {
  it('leads to /games in website mode only', () => {
    const { rerender } = render(<BackLink websiteMode />);
    const link = screen.getByTestId('back-link');
    expect(link.getAttribute('href')).toBe('/games');
    expect(link.textContent).toBe('← Seasonal Entertainment');
    expect(screen.getByRole('link', { name: 'Seasonal Entertainment' })).toBe(link);
    expect(link.className).toBe('sk-back-link');
    rerender(<BackLink websiteMode={false} />);
    expect(screen.queryByTestId('back-link')).toBeNull();
  });
});

describe('the fit hook', () => {
  function Screen(p: { readonly signature: string }) {
    const ref = useFitScale<HTMLDivElement>('mini-games', p.signature, true);
    return (
      <div ref={ref} data-testid="screen">
        <p>content</p>
      </div>
    );
  }

  it('sets the scale on its element and stops on unmount', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { unmount, rerender } = render(<Screen signature="a" />);
    expect(screen.getByTestId('screen').dataset['skFitScale']).toBe('1');
    rerender(<Screen signature="b" />);
    expect(screen.getByTestId('screen').style.getPropertyValue('--fit')).toBe('1');
    unmount();
  });

  it('does nothing without an element', () => {
    const { result } = renderHook(() => useFitScale('bingo', 'x'));
    expect(result.current.current).toBeNull();
  });
});
