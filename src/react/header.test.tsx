// @vitest-environment jsdom
/**
 * @file   src/react/header.test.tsx
 * @brief  The shared app header: its order, signed in and out, website mode, the fold below
 *         960 px, and the dev tools only when passed; the dev sign-in menu.
 *
 * Responsibility: the back link comes first and only in website mode; the brand leads to the
 *                 game's start with the emblem hidden from screen readers; links mark the
 *                 current page; signed in the chip names "name (role)" and links to the account
 *                 page, and Sign out calls the game; signed out "Sign in" and "Register", in
 *                 website mode one "Sign in"; the dev tools render only when passed. The fold
 *                 opens, moves the focus in, closes on Escape (focus back), a press outside and a
 *                 new close key. The dev menu lists the game's identities and signs in with one
 *                 click. Bingo's menuFold.test.tsx and AppShell (a43209a) for the rules.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader, type AppHeaderProps } from './AppHeader.js';
import { DevSignIn } from './dev/DevSignIn.js';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const base: AppHeaderProps = {
  websiteMode: false,
  brand: { href: '#/', emblem: <img src="emblem.webp" alt="" />, name: 'Seasonal Bingo Royale' },
  links: [
    { href: '#/', label: 'Play', active: true },
    { href: '#/leaderboard', label: 'Leaderboard', active: false },
  ],
  account: null,
  signIn: { signInHref: '#/sign-in', registerHref: '#/register' },
  closeKey: 'lobby',
};

describe('the app header', () => {
  it('signed out: brand, links with the current page, Sign in and Register, no back link', () => {
    render(<AppHeader {...base} />);
    expect(screen.queryByTestId('back-link')).toBeNull();
    const brand = screen.getByRole('link', { name: /Seasonal Bingo Royale/ });
    expect(brand.getAttribute('href')).toBe('#/');
    expect(brand.querySelector('[aria-hidden="true"] img')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Play' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Leaderboard' }).hasAttribute('aria-current')).toBe(
      false,
    );
    expect(screen.getByTestId('sign-in').getAttribute('href')).toBe('#/sign-in');
    expect(screen.getByTestId('register').getAttribute('href')).toBe('#/register');
    expect(screen.getByTestId('theme-toggle')).not.toBeNull();
    expect(screen.queryByTestId('dev-menu')).toBeNull();
  });

  it('website mode: the back link first, one Sign in to the website, no Register', () => {
    render(
      <AppHeader
        {...base}
        websiteMode
        signIn={{ signInHref: '/games/bingo/auth/website/login?next=%2F' }}
      />,
    );
    const header = screen.getByTestId('app-header');
    expect(header.firstElementChild).toBe(screen.getByTestId('back-link'));
    expect(screen.getByTestId('sign-in').getAttribute('href')).toContain('/auth/website/login');
    expect(screen.queryByTestId('register')).toBeNull();
  });

  it('signed in: the chip "name (role)" to the account page, and Sign out', () => {
    const onSignOut = vi.fn();
    render(
      <AppHeader
        {...base}
        account={{ name: 'Ana', role: 'host', href: '#/account', onSignOut }}
        navExtra={<button type="button">Chat</button>}
        devTools={<span data-testid="dev-slot" />}
        buttonClassName="sbr-btn"
      />,
    );
    const chip = screen.getByTestId('signed-in-as');
    expect(chip.textContent).toBe('Signed in as Ana (host)');
    expect(chip.getAttribute('href')).toBe('#/account');
    expect(screen.queryByTestId('sign-in')).toBeNull();
    fireEvent.click(screen.getByTestId('sign-out'));
    expect(onSignOut).toHaveBeenCalled();
    expect(screen.getByTestId('sign-out').className).toBe('sk-bar-button sbr-btn');
    expect(screen.getByRole('button', { name: 'Chat' })).not.toBeNull();
    expect(screen.getByTestId('dev-slot')).not.toBeNull();
  });
});

describe('the folded menu', () => {
  it('opens with the focus inside, closes on Escape with the focus back, on a press outside and on a new key', () => {
    const { rerender } = render(<AppHeader {...base} />);
    const button = screen.getByTestId('menu-button');
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.dataset['open']).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Play' }));
    fireEvent.keyDown(panel as HTMLElement, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
    fireEvent.keyDown(panel as HTMLElement, { key: 'Escape' });
    fireEvent.click(button);
    fireEvent.pointerDown(screen.getByRole('link', { name: 'Leaderboard' }));
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.pointerDown(document.body);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    fireEvent.pointerDown(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    rerender(<AppHeader {...base} closeKey="leaderboard" />);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('the dev sign-in menu', () => {
  it('lists the game’s identities and signs in with one click, closing the menu', async () => {
    const onSignIn = vi.fn(() => Promise.resolve());
    render(
      <DevSignIn
        identities={[
          { as: 'host', label: 'Sign in as host' },
          { as: 'admin', label: 'Sign in as admin' },
        ]}
        onSignIn={onSignIn}
      />,
    );
    const button = screen.getByTestId('dev-menu');
    expect(button.textContent).toBe('Dev sign-in');
    expect(button.className).toBe('sk-bar-button');
    fireEvent.click(button);
    expect(screen.getByRole('menu').textContent).toContain('One window holds one sign-in');
    await act(async () => {
      fireEvent.click(screen.getByTestId('dev-sign-in-admin'));
      await Promise.resolve();
    });
    expect(onSignIn).toHaveBeenCalledWith('admin');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('takes the game’s button class', () => {
    render(<DevSignIn identities={[]} onSignIn={vi.fn()} buttonClassName="sbr-btn" />);
    expect(screen.getByTestId('dev-menu').className).toBe('sk-bar-button sbr-btn');
  });
});
