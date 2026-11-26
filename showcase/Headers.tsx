/**
 * @file   showcase/Headers.tsx
 * @brief  The showcase's app headers: signed out standalone, signed in in website mode, and
 *         signed in with the development tools.
 *
 * Responsibility: four `AppHeader`s with sample words, as Seasonal Bingo Royale passes them
 *                 (its emblem stays in the game: this page draws a placeholder). The third passes
 *                 the dev tools slot with the kit's `DevSignIn` and a Quick Test link; the fourth
 *                 is a website admin's long bar in website mode (Bingo R1); a member's header with
 *                 three step badges comes last (v0.19.0). Each folds into its
 *                 menu whenever its items do not fit one row; the Playwright run opens the first
 *                 one on phones (./showcase.spec.ts) and measures the rows (./layout.spec.ts).
 *                 Never shipped.
 * Source:         new in the kit.
 */
import type { ReactElement } from 'react';

import { DevSignIn } from '../src/react/dev/index.js';
import { AppHeader, type AppHeaderProps } from '../src/react/index.js';
import type { Step } from '../src/stepShape.js';

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

// A member's three steps, as the website sends them; the files are the showcase's own
// (showcase/public/media/step-icons/), at the address the contract names.
const STEPS: readonly Step[] = [
  {
    ladder: 'holder',
    name: 'Diamond holder',
    icon: '/media/step-icons/00000000000000000000000000000001.webp',
  },
  {
    ladder: 'farmer',
    name: 'Golden farmer',
    icon: '/media/step-icons/00000000000000000000000000000002.webp',
  },
  {
    ladder: 'investor',
    name: 'Early investor',
    icon: '/media/step-icons/00000000000000000000000000000003.webp',
  },
];

const account = { name: 'Walter', role: 'host', href: '#/account', onSignOut: () => undefined };

// A member's step badges (Seasonal Cases, v0.19.0), last on the page so no open menu of the headers
// above reaches over them: three steps, and the longest chip the narrow phones have to hold.
function StepHeaders(): ReactElement {
  return (
    <>
      <h3>Signed in with step badges, website mode</h3>
      {/* Seasonal Cases (v0.19.0): the member's three step icons beside the name, in the chip.
          Last, so no open menu of the headers above reaches over it. */}
      <div data-testid="steps-header">
        <AppHeader
          {...base}
          websiteMode
          account={{ ...account, role: 'player', steps: STEPS }}
          signIn={{ href: '/games/bingo/auth/website/login?next=%2Fgames%2Fbingo%2F' }}
        />
      </div>
      <h3>The longest account chip: a long name, a long role, three steps</h3>
      {/* The worst case for the narrow phones (320 to 375 px; night audit 2026-11-25): the name is
          the website's longest (the admin's), the role two words, and all three steps. */}
      <div data-testid="steps-long-header">
        <AppHeader
          {...base}
          websiteMode
          account={{
            ...account,
            name: 'Walter Weudl-Administrator',
            role: 'website admin',
            steps: STEPS,
          }}
          signIn={{ href: '/games/bingo/auth/website/login?next=%2Fgames%2Fbingo%2F' }}
        />
      </div>
    </>
  );
}

// The two headers of the full-window screens (./Fixtures.tsx, v0.33.0): signed out, and Bingo's
// full bar with a member's three step badges, which give way before it folds.
export const PLAIN_HEADER: AppHeaderProps = base;

export const FULL_HEADER: AppHeaderProps = {
  ...base,
  websiteMode: true,
  account: { ...account, name: 'Maximilian-Alex', role: 'organiser', steps: STEPS },
  signIn: { href: '#/sign-in' },
};

// Seasonal Cases' bar (v0.22.0): the back link, its brand, six links (one long: "My matches") and
// a member's chip with three steps, in website mode. Measured at 1280, 1536 and 1920 px
// (./cases.spec.ts): the header folds only when these items do not fit one row.
// As wide as the window, as a game's header is: the page's own gutter (which grows with the root
// font) must not narrow it, or a 320 px phone at 200 % would measure the page, not the header.
const FULL_WIDTH = { width: '100vw', marginLeft: 'calc(50% - 50vw)' } as const;

// Exactly 24 characters, the longest name Cases allows.
const LONG_NAME = 'Maximilian-Alexander Ros';
const CASES_LINKS = ['Start', 'Stage', 'Chronicle', 'My matches', 'Admin', 'Privacy'];

function CasesHeader(): ReactElement {
  return (
    <>
      <h3>Seasonal Cases' bar: six links and a member with three steps</h3>
      <div data-testid="cases-header" style={FULL_WIDTH}>
        <AppHeader
          {...base}
          websiteMode
          brand={{ href: '#/', emblem: EMBLEM, name: 'Seasonal Cases' }}
          links={CASES_LINKS.map((label, i) => ({ href: `#/${label}`, label, active: i === 0 }))}
          account={{ ...account, name: 'Ana', role: 'player · rank 2', steps: STEPS }}
          signIn={{ href: '/games/cases/auth/website/login?next=%2Fgames%2Fcases%2F' }}
        />
      </div>
      <h3>Seasonal Cases' longest member: 24 characters, a rank, three steps</h3>
      <div data-testid="cases-long-header" style={FULL_WIDTH}>
        <AppHeader
          {...base}
          websiteMode
          brand={{ href: '#/', emblem: EMBLEM, name: 'Seasonal Cases' }}
          links={CASES_LINKS.map((label, i) => ({ href: `#/${label}`, label, active: i === 0 }))}
          account={{ ...account, name: LONG_NAME, role: 'player · rank 12', steps: STEPS }}
          signIn={{ href: '/games/cases/auth/website/login?next=%2Fgames%2Fcases%2F' }}
        />
      </div>
    </>
  );
}

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
      <StepHeaders />
      <CasesHeader />
    </section>
  );
}
