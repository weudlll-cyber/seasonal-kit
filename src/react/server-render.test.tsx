// @vitest-environment node
/**
 * @file   src/react/server-render.test.tsx
 * @brief  The theme toggle and the app header render on a server, where there is no `window`.
 *
 * Responsibility: `renderToString` in Node (no DOM, no `window`, no storage) gives the toggle in
 *                 its placeholder theme and the whole header with it, instead of throwing. Found
 *                 by the v0.9.0 delivery proof; audit 2026-11-22 "Noted, not changed".
 * Depends on:     vitest, react-dom/server
 */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AppHeader } from './AppHeader.js';
import { ThemeToggle } from './theme.js';

describe('rendering on a server (v0.10.1)', () => {
  it('has no window here', () => {
    expect(typeof window).toBe('undefined');
  });

  it('renders the theme toggle in its placeholder theme', () => {
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).toContain('data-sk-theme-now="light"');
  });

  it('renders the app header with the toggle', () => {
    const html = renderToString(
      <AppHeader
        websiteMode={false}
        brand={{ href: '#/', emblem: <span />, name: 'Seasonal Bingo Royale' }}
        links={[{ href: '#/', label: 'Play', active: true }]}
        account={null}
        signIn={{ href: '#/sign-in' }}
        closeKey="lobby"
      />,
    );
    expect(html).toContain('data-testid="app-header"');
    expect(html).toContain('data-testid="theme-toggle"');
  });
});
