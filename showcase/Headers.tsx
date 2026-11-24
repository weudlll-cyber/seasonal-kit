/**
 * @file   showcase/Headers.tsx
 * @brief  The showcase's app headers: signed out standalone, signed in in website mode, and
 *         signed in with the development tools.
 *
 * Responsibility: four `AppHeader`s with sample words, as Seasonal Bingo Royale passes them
 *                 (its emblem stays in the game: this page draws a placeholder). The third passes
 *                 the dev tools slot with the kit's `DevSignIn` and a Quick Test link; the fourth
 *                 is a website admin's long bar in website mode (Bingo R1). Each folds into its
 *                 menu whenever its items do not fit one row; the Playwright run opens the first
 *                 one on phones (./showcase.spec.ts) and measures the rows (./layout.spec.ts).
 *                 Never shipped.
 * Source:         new in the kit.
 */
import type { ReactElement } from 'react';

import { DevSignIn } from '../src/react/dev/index.js';
import { AppHeader, type AppHeaderProps } from '../src/react/index.js';

// A placeholder emblem: a disc in the winter colour, decorative like the games' own.
const EMBLEM = (
  <svg width="42" height="37" viewBox="0 0 42 37" role="img" aria-hidden="true">
    <circle cx="21" cy="18.5" r="16" fill="var(--sk-color-winter)" />
  </svg>
);

const base: AppHeaderProps = {
  websiteMode: false,
  brand: { href: '#/', emblem: EMBLEM, name: 'Seasonal Bingo Royale' },
  links: [
    { href: '#/', label: 'Play', active: true },
    { href: '#/host', label: 'Host a match', active: false },
    { href: '#/leaderboard', label: 'Leaderboard', active: false },
  ],
  account: null,
  signIn: { href: '#/sign-in', registerHref: '#/register' },
  closeKey: 'showcase',
};

const account = { name: 'Walter', role: 'host', href: '#/account', onSignOut: () => undefined };

export function Headers(): ReactElement {
  return (
    <section aria-labelledby="header-title" className="showcase-section">
      <h2 id="header-title">App header</h2>
      <h3>Signed out, standalone</h3>
      <AppHeader {...base} />
      <h3>Signed in, website mode</h3>
      <AppHeader
        {...base}
        websiteMode
        account={account}
        signIn={{ href: '/games/bingo/auth/website/login?next=%2Fgames%2Fbingo%2F' }}
      />
      <h3>Signed in, with the development tools</h3>
      <AppHeader
        {...base}
        account={{ ...account, name: 'dev-host' }}
        navExtra={<a href="#/quicktest">Quick Test</a>}
        devTools={
          <DevSignIn
            identities={[
              { as: 'host', label: 'Sign in as host' },
              { as: 'player-1', label: 'Sign in as player 1' },
            ]}
            onSignIn={() => Promise.resolve()}
          />
        }
      />
      <h3>A website admin, website mode</h3>
      {/* Bingo's longest bar (R1): the back link, five links and the admin's chip, more than
          one row holds at 1280 px, so it folds there by measure, not by a fixed width. */}
      <div data-testid="admin-header">
        <AppHeader
          {...base}
          websiteMode
          links={[
            ...base.links,
            { href: '#/organize', label: 'Organize', active: false },
            { href: '#/admin', label: 'Admin', active: false },
          ]}
          account={{ ...account, name: 'Walter Weudl-Admin', role: 'website admin' }}
          signIn={{ href: '/games/bingo/auth/website/login?next=%2Fgames%2Fbingo%2F' }}
        />
      </div>
    </section>
  );
}
