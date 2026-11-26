/**
 * @file   src/react/AppHeader.tsx
 * @brief  The shared app header of every game (DECISIONS K21): back link, brand, navigation,
 *         account, the development tools where the game passes them, and the theme toggle.
 *
 * Responsibility: one bar, in this order, on screen and in the DOM alike, so the tab order is
 *                 the order shown (since v0.10.0; audit 2026-11-22, B7 finding 4):
 *                 1. in website mode "← Seasonal Entertainment" (./BackLink);
 *                 2. the brand: the game's emblem, its name and the "Seasonal Entertainment"
 *                    wordmark, a link to the game's start;
 *                 3. the navigation: the game's links, the current one `aria-current="page"`,
 *                    then anything the game adds (its chat button, a Quick Test link);
 *                 4. the account: signed in, the chip "name (role)" to the account page and
 *                    "Sign out"; signed out, "Sign in" and "Register", or in website mode one
 *                    "Sign in" to the website; the member's step badges (`steps`, since
 *                    v0.19.0) sit as small icons in the chip, drawn only for the website's own
 *                    icon addresses (../stepShape), in the folded menu too;
 *                 5. the development tools, rendered only when the game passes them (its lazily
 *                    loaded ./dev DevSignIn, behind its dev flag);
 *                 6. the theme toggle (./theme).
 *                 The chip is filled and signed out "Sign in" is the one primary button; on a
 *                 phone the back link's row is lower (../../css/header.css, header-account.css, K96).
 *                 When they would not fit on one row, the navigation and the account fold
 *                 into one menu button (./MenuFold, ./useHeaderFold; since v0.11.0, measured
 *                 before the paint; the step badges give way first, since v0.33.0; a game may also name a width under which it always folds, `foldBelow`,
 *                 since v0.13.0). Its sizes keep the game's floors
 *                 (../../css/header.css, K14). The words of the links, the role and the routes
 *                 are the game's; the header holds only their places.
 * Source:         seasonal-bingo-royale apps/web/src/shell/AppShell.tsx (the bar, `Nav`,
 *                 `Account`) and shell.css at a43209a: Bingo's test server's header, which the
 *                 owner made every game's (D5, 2026-11-21). Built on ./BackLink, ./theme
 *                 (ThemeToggle) and ./MenuFold.
 */
import type { ReactElement, ReactNode } from 'react';

import type { Step } from '../stepShape.js';
import { BackLink } from './BackLink.js';
import { MenuFold } from './MenuFold.js';
import { StepBadges } from './StepBadges.js';
import { ThemeToggle } from './theme.js';
import { barButtonClass } from './barButtonClass.js';

export interface HeaderLink {
  readonly href: string;
  readonly label: string;
  readonly active: boolean;
}

export interface HeaderAccount {
  readonly name: string;
  // The game's word for the role, e.g. "host", "player".
  readonly role: string;
  readonly href: string;
  readonly onSignOut: () => void;
  // The member's website step badges (since v0.19.0), in the shape of ./server's `Step`: each
  // is drawn as a small icon beside the name, named by the step. Only the contract's own icon
  // address is drawn (`isStepIcon`); at most three. Left out or empty: the chip is as before.
  readonly steps?: readonly Step[];
}

export interface AppHeaderProps {
  readonly websiteMode: boolean;
  readonly brand: {
    readonly href: string;
    // The game's emblem image (decorative: its name follows).
    readonly emblem: ReactNode;
    readonly name: string;
  };
  readonly links: readonly HeaderLink[];
  // After the links: the game's chat button, its Quick Test link.
  readonly navExtra?: ReactNode;
  // Signed in, or null.
  readonly account: HeaderAccount | null;
  // Signed out: where "Sign in" (website mode: the website's sign-in) and "Register" lead;
  // `registerHref` is left out in website mode (`href`, since v0.10.0, was `signInHref`).
  readonly signIn: { readonly href: string; readonly registerHref?: string };
  readonly devTools?: ReactNode;
  // Closes the folded menu when it changes (route, account).
  readonly closeKey: string;
  readonly buttonClassName?: string;
  // Always fold under this window width in px, on top of the measured fold (since v0.13.0;
  // Bingo folds below 960 px). Left out: the measure alone decides, as before.
  readonly foldBelow?: number;
}

function Nav(p: Pick<AppHeaderProps, 'links' | 'navExtra'>): ReactElement {
  return (
    <nav className="sk-header-nav" aria-label="Main">
      {p.links.map((link) => (
        <a key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined}>
          {link.label}
        </a>
      ))}
      {p.navExtra}
    </nav>
  );
}

function Account(p: Omit<AppHeaderProps, 'brand' | 'links' | 'navExtra' | 'closeKey'>) {
  const button = barButtonClass(p.buttonClassName);
  const { account, signIn } = p;
  return (
    <div className="sk-header-account" data-testid="account">
      {account === null ? (
        <>
          <a className={`${button} sk-header-primary`} href={signIn.href} data-testid="sign-in">
            Sign in
          </a>
          {p.websiteMode || signIn.registerHref === undefined ? null : (
            <a className={button} href={signIn.registerHref} data-testid="register">
              Register
            </a>
          )}
        </>
      ) : (
        <>
          <a className="sk-header-chip" href={account.href} data-testid="signed-in-as">
            {/* One run of text: the chip lays its children out side by side, which would drop
                the space between two of them ("Signed in asOlga", fixed in v0.28.0). */}
            <span>
              {/* Shown on wide screens, read out on narrower ones (../../css/header.css). */}
              <span className="sk-header-chip-prefix">Signed in as </span>
              {account.name} ({account.role})
            </span>
            <StepBadges
              steps={account.steps}
              className="sk-header-steps"
              imageClassName="sk-header-step"
            />
          </a>
          <button
            type="button"
            className={button}
            data-testid="sign-out"
            onClick={account.onSignOut}
          >
            Sign out
          </button>
        </>
      )}
      {p.devTools}
    </div>
  );
}

export function AppHeader(p: AppHeaderProps): ReactElement {
  return (
    <header className="sk-header" data-testid="app-header">
      <BackLink websiteMode={p.websiteMode} />
      <a className="sk-header-brand" href={p.brand.href}>
        <span className="sk-header-emblem" aria-hidden="true">
          {p.brand.emblem}
        </span>
        <span>
          {p.brand.name}
          <small>Seasonal Entertainment</small>
        </span>
      </a>
      {/* Folded, the Menu button and the toggle are one group that wraps together (since
          v0.33.0); unfolded the group has no box of its own. */}
      <div className="sk-header-controls">
        <MenuFold
          closeKey={p.closeKey}
          {...(p.buttonClassName === undefined ? {} : { buttonClassName: p.buttonClassName })}
          {...(p.foldBelow === undefined ? {} : { foldBelow: p.foldBelow })}
        >
          <Nav links={p.links} navExtra={p.navExtra} />
          <Account {...p} />
        </MenuFold>
        {/* Last in the DOM as on screen, so Tab meets it where the eye does (WCAG 2.4.3). */}
        <ThemeToggle />
      </div>
    </header>
  );
}
