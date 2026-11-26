// @vitest-environment jsdom
/**
 * @file   src/react/headerPrimary.test.tsx
 * @brief  The app header has one primary button, and only when signed out (K96).
 *
 * Responsibility: signed out, "Sign in" alone carries `sk-header-primary`, standalone and in
 *                 website mode; "Register" does not; signed in, nothing does. Its look is
 *                 ../../showcase/looks.spec.ts's.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppHeader, type AppHeaderProps } from './AppHeader.js';

const base: AppHeaderProps = {
  websiteMode: false,
  brand: { href: '#/', emblem: <span />, name: 'Seasonal Bingo Royale' },
  links: [{ href: '#/', label: 'Play', active: true }],
  account: null,
  signIn: { href: '#/sign-in', registerHref: '#/register' },
  closeKey: 'lobby',
};

const primaries = (): (string | null)[] =>
  [...document.querySelectorAll('.sk-header-primary')].map((e) => e.textContent);

afterEach(cleanup);

describe('the header’s one primary button', () => {
  it.each([false, true])('signed out it is "Sign in" alone (website mode: %s)', (websiteMode) => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<AppHeader {...base} websiteMode={websiteMode} />);
    expect(primaries()).toEqual(['Sign in']);
  });

  it('signed in there is none', () => {
    render(
      <AppHeader
        {...base}
        account={{ name: 'Walter', role: 'player', href: '#/account', onSignOut: vi.fn() }}
      />,
    );
    expect(primaries()).toEqual([]);
  });
});
