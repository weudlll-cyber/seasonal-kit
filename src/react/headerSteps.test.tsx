// @vitest-environment jsdom
/**
 * @file   src/react/headerSteps.test.tsx
 * @brief  A member's step badges in the app header's account chip (v0.19.0, Seasonal Cases).
 *
 * Responsibility: without the `steps` field, or with an empty one, the chip is exactly as before;
 *                 each step with the website's own icon address is drawn as an image named by the
 *                 step, inside the chip, after the name and the role, and at most three of them;
 *                 an address in any other form (another route, another host, a script, upper-case
 *                 hex, another file type, a short name, a query) is not drawn, and neither is a
 *                 step without an icon. The check is ../stepShape's `isStepIcon`, the server's.
 *                 Where the header folds and how it measures is showcase/steps.spec.ts's.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit (split from ./header.test.tsx, whose limit is 300 lines).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader, type AppHeaderProps } from './AppHeader.js';

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
  websiteMode: true,
  brand: { href: '#/', emblem: <span />, name: 'Seasonal Cases' },
  links: [{ href: '#/', label: 'Play', active: true }],
  account: null,
  signIn: { href: '/games/cases/auth/website/login' },
  closeKey: 'lobby',
};

const ICON = '/media/step-icons/0123456789abcdef0123456789abcdef.webp';
const account = { name: 'Ana', role: 'host', href: '#/account', onSignOut: vi.fn() };
const images = () => [...screen.getByTestId('signed-in-as').querySelectorAll('img')];

describe('the account chip with steps', () => {
  it('renders as before without the field and with an empty one', () => {
    const { rerender } = render(<AppHeader {...base} account={account} />);
    expect(images()).toEqual([]);
    expect(screen.getByTestId('signed-in-as').textContent).toBe('Signed in as Ana (host)');
    rerender(<AppHeader {...base} account={{ ...account, steps: [] }} />);
    expect(images()).toEqual([]);
    expect(screen.getByTestId('signed-in-as').querySelector('.sk-header-steps')).toBeNull();
  });

  it('shows each step as a small icon named by the step, beside the name', () => {
    const steps = [
      { ladder: 'holder', name: 'Diamond holder', icon: ICON },
      { ladder: 'farmer', name: 'Golden farmer', icon: ICON.replace('0123', 'abcd') },
    ] as const;
    render(<AppHeader {...base} account={{ ...account, steps }} />);
    expect(screen.getByRole('img', { name: 'Diamond holder' }).getAttribute('src')).toBe(ICON);
    expect(screen.getByRole('img', { name: 'Golden farmer' })).not.toBeNull();
    // Inside the chip, after the name and the role, so the chip's own words are unchanged.
    expect(screen.getByTestId('signed-in-as').textContent).toBe('Signed in as Ana (host)');
    expect(images()).toHaveLength(2);
  });

  it('draws at most three, as the website sends at most three', () => {
    const steps = ['holder', 'farmer', 'investor', 'holder'].map((ladder, i) => ({
      ladder: ladder as 'holder' | 'farmer' | 'investor',
      name: `Step ${String(i)}`,
      icon: ICON,
    }));
    render(<AppHeader {...base} account={{ ...account, steps }} />);
    expect(images().map((img) => img.alt)).toEqual(['Step 0', 'Step 1', 'Step 2']);
  });

  it.each([
    ['another route of the site', '/media/other/0123456789abcdef0123456789abcdef.webp'],
    [
      'an absolute address',
      'https://example.org/media/step-icons/0123456789abcdef0123456789abcdef.webp',
    ],
    ['a script address', 'javascript:alert(1)'],
    ['upper-case hex', '/media/step-icons/0123456789ABCDEF0123456789ABCDEF.webp'],
    ['another file type', '/media/step-icons/0123456789abcdef0123456789abcdef.png'],
    ['a short name', '/media/step-icons/abc.webp'],
    ['a query after the file', `${ICON}?x=1`],
  ])('does not render an icon with %s', (_what, icon) => {
    render(
      <AppHeader
        {...base}
        account={{ ...account, steps: [{ ladder: 'holder', name: 'Bad', icon }] }}
      />,
    );
    expect(images()).toEqual([]);
  });

  it('shows no icon for a step without one', () => {
    const steps = [{ ladder: 'investor', name: 'No picture', icon: null }] as const;
    render(<AppHeader {...base} account={{ ...account, steps }} />);
    expect(images()).toEqual([]);
  });
});
