# Changelog

All notable changes to `@seasonal/kit`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as [docs/RELEASING.md](docs/RELEASING.md)
applies it.

## [Unreleased]

The audit's noted items (docs/AUDIT-2026-11-22.md "Noted, not changed").

### Added

- `ChatDock` tells a screen reader when the unread count changes: a visually hidden polite
  live region (role `status`) says "2 unread chat messages", and nothing on the first render or
  once the chat is read.
- `useDisclosure` returns `dismiss`: it closes and leaves the focus where it is, for a press
  outside or a focus already gone elsewhere. Stable across renders like `close` and `toggle`.

### Changed

- The header's menu (`MenuFold`) is built on `useDisclosure` instead of its own state. Its
  behaviour is unchanged: the header's tests run as before, plus one that a press outside leaves
  the focus alone.

- Renovate updates the scanner images' tags and digests in `ci.yml`'s `env:` (a regex
  manager), and `packageManager` carries pnpm's sha512 hash (docs/RELEASING.md). Nothing a game
  installs changes.
- **Every data attribute the kit sets or reads is `data-sk-` prefixed**, like its classes and
  keyframes (DECISIONS K7). tests/prefix.test.ts now checks attributes too, in the CSS, the
  source and the early script. Two attributes stay as they are: `data-testid`, the testing
  library's convention, and `data-theme`, the website's. Every rename is listed below.
- `fit.ts`'s tolerances are named constants with the reason for each: 0.5 px still fits, 1 px
  of scroll in a clipping box is rounding, and the guess margin, rounding step and 1 % stop.
  The values are unchanged.
- The server entry decodes its name and steps headers with one shared strict UTF-8 decoder
  (`src/server/utf8.ts`) instead of making one per steps header.

### Migration, per game

Players see no change. In a game's code, before → after:

| Before                                    | After                                              | Where                                         |
| ----------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `data-fit-fixed` (the game marks a part)  | `data-sk-fit-fixed`                                | a screen fitted with `watchFit`/`useFitScale` |
| `data-fit-scale` (set by the kit)         | `data-sk-fit-scale`, `dataset['skFitScale']`       | a test that reads the scale                   |
| `data-view`                               | `data-sk-view`                                     | `ChatDock`, `DockedScreen`                    |
| `data-bar`, `data-open`                   | `data-sk-bar`, `data-sk-open`                      | `ChatDock` (`data-sk-open` on `MenuFold` too) |
| `data-form`                               | `data-sk-form`                                     | the call slot                                 |
| `data-phase`, `data-current`, `data-done` | `data-sk-phase`, `data-sk-current`, `data-sk-done` | `PhaseStrip`                                  |
| `data-layout`                             | `data-sk-layout`                                   | `ResultFrame`                                 |
| `data-season`                             | `data-sk-season`                                   | `StartCard`                                   |
| `data-theme-now`                          | `data-sk-theme-now`                                | `ThemeToggle`                                 |

A game's own CSS or test that names one of the old attributes changes it the same way. No game
uses the kit yet (docs/ADOPTION.md), so nothing in a game's code breaks today.

- **The dev sign-in menu** (`DevSignIn`, development only) closes on a press outside, like the
  header's fold: both use one hook, `src/react/usePressOutside.ts`, moved out of `MenuFold`.
  Its failure alert names the label the menu showed ("Dev sign-in failed: Sign in as host.")
  instead of the route's id ("Dev sign-in as player-1 failed.").

### Fixed

- `ThemeToggle` (and so `AppHeader`) renders on a server: `useTheme` no longer reads `window`
  or storage while rendering. A render before the theme is known shows the light toggle; in
  the browser a layout effect resolves the theme before the first paint, and `<html
data-theme>` is written only once it is known.

## [0.10.0] - 2026-11-22

Keyboard, focus and touch fixes from the audit of 2026-11-22, B7, and its API cleanup, B4, both
before any game adopts the kit (DECISIONS K29). The API changes break; each is below with its
before and after.

### Added

- One kit focus ring: `--sk-focus-ring` (the text colour) on every control the kit draws, for
  keyboard focus, 2 px outside the control (css/shell.css). Its contrast is checked at 3:1 or
  more on the page, the surfaces, the card and across the header's whole background, in light
  and dark.
- The contrast check covers the header's background (`--sidebar-background`): the text and the
  muted text on every stop and 15 points between each two, since a blend can be darker
  than its ends. A stop the check cannot read fails it instead of being skipped.
- The showcase: four screens of the focus ring (`focus-ring-<viewport>-<theme>.png`, desktop and
  phone, light and dark) and a check that nothing scrolls sideways at 320 px.

### Changed

- **The header's menu** (`AppHeader`, below 960 px) closes when the focus leaves it, and on
  Escape on the Menu button too. When a new page (`closeKey`) closes it while the focus was
  inside, the focus goes to the Menu button instead of the page's start.
- **The header's order:** the theme toggle is now last, after the account, on wide screens as in
  the DOM, so the tab order is the order shown. Below 960 px the row is brand, Menu, toggle.
  `header.css` sets no `order` any more.
- **The phone chat sheet** takes the focus (its Close button) when it opens; Escape and Close
  give it back to the chat bar, as before.
- **Targets:** the game bar's buttons are 44 px on a desktop too (36 px before); the back link is
  a 44 px target.
- **The phase strip** wraps its parts instead of scrolling sideways when they do not fit; its
  text keeps the game's floor.
- **Breaking (`@seasonal/kit/server`):** the request-headers type `Headers` is `RequestHeaders`,
  so it no longer hides the Fetch API's global `Headers` in a game's file.
- **Breaking (`@seasonal/kit/react`):** `BarIconName` names the panel icons only (`chat`,
  `players`, `host`); the full-screen button's `expand` and `shrink` are the bar's own.
- **Breaking:** `GameBar`'s `time` is always given (`null` before the round opens), as every kit
  prop says "none" with `null`; `AppHeader`'s `signIn.signInHref` is `signIn.href`.
- **Breaking (`@seasonal/kit/devtools`):** `devStubPlugin` takes one options object
  (`{ devModule, stub }`, the new type `DevStubOptions`), like `devSignInAccount`'s rules;
  `devMarkersIn` returns a readonly list.
- `BackLinkProps` is exported, like every other component's props. `useDisclosure`'s `toggle`
  and `close` keep their identity across renders, like `usePanels`'.
- Kept as they are: `connectCall` and `CALL_SLOT` (BACKLOG 8 needs them, K29).
- The repository's GitHub settings (DECISIONS K24): merge commits only, the branch deleted
  after a merge, a ruleset that keeps `v*` tags from being moved or deleted, vulnerability alerts
  on, no wiki or Projects, actions pinned to commit SHAs. Read back in docs/RELEASING.md.
- CLAUDE.md: `seasonal-spirits` and `seasonal-cases` are read-only sources too; planning happens
  in the Seasonal Entertainment planning chat (K25); a night's sheet branch may stay on origin
  until its PR merges.
- Decided (K26–K28): the fonts stay as they are; legacy recovery codes keep working with no end
  date; Seasonal Cases takes v0.10.0 (docs/ADOPTION.md, docs/security-pass.md).

### Migration, per game

What a player sees change, before → after, for a game that takes v0.10.0:

- **Every game with `AppHeader`:** the theme toggle moves from between the brand and the
  navigation to the end of the bar (wide screens); on a phone the row is brand, Menu, toggle
  instead of brand, toggle, Menu. A keyboard focus shows the kit's ring. Nothing to change in
  the game's code.
- **Every game with `BackLink`:** the link is a 44 px target (its words the same size), so the
  phone's first row is 44 px high instead of one line of small text.
- **Mini Games (`GameBar`, `buttonClassName="smg-btn"`):** the bar's buttons are 44 px instead of
  36 px on a desktop; the bar itself stays at most 44 px high.
- **Mind Games' `PhaseStrip`:** parts that do not fit side by side wrap to a second row
  instead of running off a narrow screen.
- **A game with its own focus styles** on the kit's classes keeps them: the kit's ring is in
  `:where()`, so a game's own `:focus-visible` rule on those controls wins.

The API breaks, before → after (no game pins the kit yet; each adoption step takes them):

| Where                    | Before (v0.9.x)                                                  | After (v0.10.0)                                                  |
| ------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Server, both games       | `import type { Headers } from '@seasonal/kit/server'`            | `import type { RequestHeaders } from '@seasonal/kit/server'`     |
| `AppHeader`, both games  | `signIn={{ signInHref: '/sign-in', registerHref: '/register' }}` | `signIn={{ href: '/sign-in', registerHref: '/register' }}`       |
| `GameBar`, Mini Games    | `time` left out before the round opens                           | `time={null}` before the round opens                             |
| `GameBar` actions        | `icon: 'expand'` or `'shrink'` was allowed                       | `icon` is `'chat'`, `'players'` or `'host'`                      |
| Server build, both games | `devStubPlugin(/devSignIn\.js$/, stubPath)`                      | `devStubPlugin({ devModule: /devSignIn\.js$/, stub: stubPath })` |
| Bundle test, both games  | `devMarkersIn(dir, markers).sort()`                              | `[...devMarkersIn(dir, markers)].sort()` (the list is readonly)  |

## [0.9.1] - 2026-11-22

The fixes of the audit of 2026-11-22 ([docs/AUDIT-2026-11-22.md](docs/AUDIT-2026-11-22.md)) that
change nothing a game relies on. Nothing for a game to migrate.

### Security

- **A route, a session-ended header, a chat path or a website login path** with a space, tab or
  newline is no longer a path on this site. The URL parser drops a tab or newline, so
  `/\t/evil.example` led off the site. One check now serves all of them (`src/localPath.ts`).
- **A website name with a control, line-separator or bidi character** gives no identity, so it
  cannot split a log line or show another name. Emoji joined by U+200D still pass.
- **`devMarkersIn`** scans a symlinked file through its target.
- **CI:** no checkout keeps the job's token on disk; CodeQL's write permission is on its job
  only; `dist/` is emptied before the rebuild check.

### Fixed

- **The recovery key** is checked realm-safely: a `Buffer` from a jsdom test or a vm context
  is a byte array too (found by the v0.9.0 delivery proof).
- **`DevSignIn`** is a plain disclosure (the button's `aria-expanded`), not an ARIA menu
  without arrow keys. Its panel's test id is `dev-menu-panel`.
- **The back link's arrow** is hidden from screen readers: the link is named "Seasonal
  Entertainment". It looks the same.

### Added

- The `FitGame` type, which `StartCard`, `ResultFrame` and `useFitScale` take.

### Changed

- Inside the kit, with no change for a game:
  - one `barButtonClass` helper;
  - the recovery-code tests in their own file;
  - new tests for the steps header's size cap, every ladder and a detached frame;
  - review references that name their pass;
  - missing `Source:` lines;
  - a dead regex branch removed.
- Docs:
  - SHOWCASE.md (the headers, 24 screens);
  - DELIVERY.md (the v0.9.0 proof);
  - RELEASING.md (step 7, the delivery proof);
  - SECURITY.md;
  - security-pass.md;
  - ADOPTION.md (pass `req.socket.remoteAddress` as the peer);
  - corrections in NIGHT-2026-11-21.md.
- `.gitignore` takes `.env`, agent worktrees and OS files; lefthook lints staged `.tsx`.

## [0.9.0] - 2026-11-21

The shared app header and the development tools, and the owner's decisions D1–D6 of
2026-11-21 (DECISIONS K17–K22).

### Added

- `AppHeader` (`@seasonal/kit/react`) and `@seasonal/kit/header.css`: Bingo's bar as the shared
  header (K21). It shows the back link first in website mode; the brand with the emblem, the
  game's name and the "Seasonal Entertainment" wordmark; the game's links with the current one
  solid; the theme toggle; and the account: the chip "name (role)" leading to the account page,
  plus Sign out. Signed out it shows "Sign in" and "Register", or one "Sign in" in website
  mode. Below 960 px the links and the account fold into one "Menu": the focus moves in,
  Escape closes it and gives the focus back, and so do a press outside and a new `closeKey`. A
  `navExtra` slot and a `devTools` slot. `header.css` needs `bar.css`.
- `DevSignIn` (`@seasonal/kit/react/dev`): the development sign-in menu with the game's
  identities, for a game to load lazily and only in development.
- `@seasonal/kit/devtools`, the server side of the dev tools as a shared recipe:
  `devSignInAccount` (the request checked against the game's dev accounts and its load-player
  pattern; own keys only), `devStubPlugin` (an esbuild plugin that swaps the dev module for a
  stub in the production bundle) and `devMarkersIn` with `KIT_DEV_MARKERS` (the bundle test's
  scan).
- `recoveryLookups` and `recoveryMatches` (`@seasonal/kit/server`).
- The showcase shows the three headers. On every phone viewport and theme it opens the menu and
  the dev menu, with axe.
- `docs/ADOPTION.md`: per game, which of its files each kit export replaces (paths and lines),
  what stays, the order of steps, the risks and the tests to run, and what needs the owner's
  word. Now also the header and dev tools for every game, Bingo's docked layout with the sweep
  condition (K18), and Seasonal Party's header once it has accounts.

### Changed

- **Breaking:** `WebsiteChatFrame` is always sandboxed (K17); the `sandboxed` prop is gone.
- **Breaking:** `recoveryHash(code, style, key)` is HMAC-SHA-256 with the game's key, at least
  32 bytes (K20). A shorter key throws.
- `identityFrom` decodes the name header as the website encodes it (K22): the header's bytes
  as UTF-8. An ASCII name is unchanged; a name sent as UTF-8 bytes ("Jürgen", an emoji) is
  decoded; bytes that are not UTF-8 give no identity instead of a garbled name.
- `showcase` is a required check of master (K19). CONTRIBUTING lists the six.
- `docs/DELIVERY.md` records the v0.8.0 proof.

### Security

An independent review of the dev tools and the recovery codes ran before the release. It found
no high-severity defect, 5 medium and 7 low findings. Fixed (docs/security-pass.md):

- **The recovery key** must be a byte array of 32 bytes or more that are not one byte repeated;
  `recoveryMatches` checks it before it looks at the stored hash.
- **`devSignInAccount`:** a load name must match the game's pattern as a whole and have at most
  64 characters. A pattern with the g or y flag throws. That error's message is a server
  marker in `KIT_DEV_MARKERS`, so a leaked dev sign-in is found in a server bundle too.
- **`devStubPlugin`** also sees absolute imports and refuses a g or y pattern. An import through
  a package name, a `paths` alias or `#imports` is still not seen (the bundle scan is the
  backstop).
- **`DevSignIn`** shows a failed sign-in as an alert instead of leaving an unhandled rejection.

A second fresh review of the fixed diff found 1 medium and 5 low. Fixed: a test ties the
markers to what `DevSignIn` renders; `devSignInAccount` reads only the body's own `as`; the
stored hash is measured in bytes; the plugin's header says it tests the import as written.

Not changed, and recorded: legacy SHA-256 codes keep verifying (D4) until each is used or
replaced, so those rows stay as weak as before against a leaked or writable table. The
departure from the website's AUTH.md (plain SHA-256 there) is the owner's D4.

### Migration, per game

- **Both games:**
  - drop `sandboxed` from `WebsiteChatFrame`. Bingo's frame gets the sandbox: run its chat
    e2e;
  - create a recovery key (32 random bytes or more) and keep it with the server's secrets.
    Never use the key that encrypts TOTP secrets, so losing that one leaves the codes working;
  - store new codes with `recoveryHash(code, style, key)`, and look up with
    `code_hash = ANY($2)` and `recoveryLookups(code, style, key)`, so old SHA-256 codes still
    work; or compare one stored hash with `recoveryMatches`;
  - the header and dev tools as [docs/ADOPTION.md](docs/ADOPTION.md) lists them.
- **Bingo Royale:** its bar becomes `AppHeader` with `buttonClassName="sbr-btn"`. Its look stays.
- **Mini Games:** its bar becomes `AppHeader`. The "Signed in as" prefix now shows only above
  1440 px, as in Bingo.

## [0.8.0] - 2026-11-21

Server sign-in through the website and two-factor sign-in, for a game's server
(`@seasonal/kit/server`, Node only): the checks and the codes. Accounts, sessions and every
database statement stay in the games.

### Added

- The website sign-in's checks:
  - `trustedPeers`, the TCP peer against the trusted addresses and ranges;
  - `secretMatches`, the proxy secret in constant time. An empty secret refuses everyone;
  - `websiteSignInCheck`, the route's whole decision: `untrusted`, `guest`, `invalid` or
    `member` with the checked identity. The game answers each kind its own way;
  - `identityFrom`, `isWebsiteGuest`, `IDENTITY_HEADERS`;
  - the steps checked by the stricter rule of both games, with `steps: 'each' | 'all'` as the
    game's choice;
  - `mappedRoles` (admin → `game_admin`, may host → `organizer`, nothing else).
- `safeNext` and `websiteLoginLocation`: the return path under the base path, and the login hop
  with each nested parameter encoded on its own.
- Two-factor sign-in:
  - `newSecret`, `base32Encode`, `base32Decode`, `otpauthUri` with the game as issuer, `hotp`,
    `stepAt`;
  - `matchingStep`: one step of drift, a used step refused, all three candidates compared in
    constant time;
  - `newRecoveryCodes`, `recoveryHash`, `looksLikeRecoveryCode`, in each game's style
    (`grouped` for Mini Games, `hex` for Bingo), so stored codes keep working.
- `RateLimiter` (the rules stay each game's; at most `maxKeys` keys) and `SessionEnds` (one
  failing listener, thrown or rejected, stops no other).

### Security

Before release, three independent reviews ran, each fresh, on the whole diff:

- the first found 3 medium and 7 low findings;
- the second found 1 medium and 6 low;
- the third was clean, with 5 low findings and 2 noted.

Every confirmed finding is fixed (docs/security-pass.md). What the fixes change for a game:

- **The role header** must be exactly one of `member`, `organiser`, `admin`, as the contract
  sends it. A list or an unknown role is no identity (`invalid`). Both games split a comma list
  today; the website never sends one, and a joined repeat of the header could have added
  `admin`.
- **A guest header** that is present and not exactly `false` makes a guest.
- **The user id** is a positive safe integer without leading zeros.
- **A missing steps header** is marked `badSteps`, since the contract requires it.
- **A trusted proxy entry** with a bad CIDR prefix throws at startup instead of trusting every
  peer.
- **A TOTP secret** under 16 bytes is refused.
- **Dot segments** in `next` lead to the base path.
- **`SessionEnds`** takes the game's `onError` (its log). `end` returns a promise that never
  rejects; every listener's failure, thrown or rejected, goes to `onError`.
- **A step's icon** must be exactly `/media/step-icons/<32 hex>.webp`, the contract's form.
- **The rate limiter** scans a full map at most once a tenth of its window, and refuses a new key
  without a scan in between. Games key it by account and by IPv6 /64.
- **The otpauth link** encodes spaces as `%20`.
- **`next`** with an encoded `/`, `\` or NUL in its path leads to the base path.
- **TOTP** matches nothing at a time that is not finite or before the first step.
- **A guest header** that is present and empty makes a guest.
- **`SessionEnds.end`** is called without `await` in a route: one listener that never settles
  would keep it pending. An async `onError` that rejects is caught.

### Migration, per game

- **Mini Games:** once it pins v0.8.0, it may:
  - replace `trustedPeers`, `identityFrom`, `isWebsiteGuest`, `stepsFrom` and `mappedRoles` in
    `apps/server/src/auth/websiteIdentity.ts`, and `safeNext`, `proxySecret` and `toLogin` in
    `apps/server/src/http/routes/websiteSignIn.ts`, with `websiteSignInCheck` (`steps:
'each'`) and `websiteLoginLocation`. It keeps answering `invalid` with 403
    `NO_WEBSITE_USER` and `guest` with the login hop;
  - replace `apps/server/src/auth/totp.ts`, and `recoveryCode` and `hashOf` in `twoFactor.ts`
    (`'grouped'`). Its SQL stays;
  - replace `RateLimiter` (its `RATE_RULES` stay) and `SessionEnds`.
- **Bingo Royale:** the same with `steps: 'all'`, which logs `badSteps` once as today, and
  `'hex'` recovery codes. It keeps answering both `guest` and `invalid` with its login hop.
  `otpauthUri(secret, name, 'Seasonal Bingo Royale')` and `newSecret` keep their meaning; the
  link now also names `algorithm=SHA1`, which authenticator apps already assume.

## [0.7.0] - 2026-11-21

The showcase and its accessibility check, and two fixes it found.

### Added

- The showcase (`showcase/`, never shipped): every component of `@seasonal/kit/react` with sample
  content, in light and dark (docs/SHOWCASE.md). `pnpm showcase` serves it; `pnpm showcase:test`
  screenshots it at 1280 × 720, 1536 × 768, 1920 × 1080, 375 × 667 and 390 × 844, in both themes,
  with the start card and the result in the dock (20 screens), and runs axe on each: no serious
  or critical violation. The screens land in `showcase/screens/`, git-ignored and emptied before
  every run (DECISIONS K16).
- CI job `showcase`: the same run on every PR and on master (Chromium).
- Dev dependencies, pinned as Mini Games pins them: `@playwright/test` 1.64.1 and
  `@axe-core/playwright` 4.13.0.

### Fixed

- `DockedScreen` on a phone no longer sets its own height to the visual viewport's. It
  publishes `--sk-visible-height` on `<html>` instead, which the game's root takes, so the dock
  can sit under other parts of a page without spilling over them.
- A list game's result first part keeps its rows together at the top when the docked screen
  gives it more height (`frames.css`).

### Migration, per game

- **Mini Games:** where it adopts `DockedScreen`, its root's height on a phone comes from
  `height: var(--sk-visible-height, 100dvh)` on `#root`; it was set inline by `DockedMatch`
  before. Nothing else changes.
- **Bingo Royale:** nothing to do.

## [0.6.0] - 2026-11-21

The round's focus mode: the slim game bar in place of the app header, its panels, full screen
and the phase strip.

### Added

- `GameBar` (`@seasonal/kit/react`, `@seasonal/kit/bar.css`):
  - one row, at most 44 px on a desktop and 52 px on a phone;
  - the game's lead part, facts (`desktopOnly` ones are read out on a phone) and the time with
    " left";
  - a button per panel with its icon (chat, players, host), words and an unread badge, plus
    the full-screen toggle where the browser offers it;
  - `buttonClassName` keeps a game's own button look.
- `usePanels` (one panel at a time; the focus goes back to its button), `useFullscreen`, and
  `useFocusMode`, which marks `<html data-sk-focus>` so the game's CSS hides its own header.
- `PhaseStrip`: the parts in proportion to their lengths, the current one framed and filled,
  with "· now" in words and `aria-current`; ended parts done; the game's line and status.
- `clockText` (`@seasonal/kit`): "9:05", rounding down, never below 0:00.
- `--sk-floor-badge` (`fit.css`, `FIT_FLOORS.badge`): Mini Games' 12 px unread badge, Bingo
  14 px. The floor guard covers it.

### Changed

- `.sk-visually-hidden` moved from `dock.css` to `shell.css`, the shared basics, since the dock
  and the bar both use it. A game that imports `dock.css` also imports `shell.css`.
- `docs/DELIVERY.md` records the v0.5.0 proof.

### Migration, per game

- **Mini Games:** once it pins v0.6.0, it may:
  - build `round/FocusBar.tsx` on `GameBar` with `buttonClassName="smg-btn"`. Its season pill,
    mode fact and `barTime` stay its own, and `FocusIcons.tsx` goes away;
  - replace `round/usePanels.ts` and `round/useFullscreen.ts` with the kit's
    (`usePanels<PanelId>()`);
  - set the focus mode with `useFocusMode()`. Its rule `#root:has(.focus-mode) .shell-bar` becomes
    `html[data-sk-focus] .shell-bar`;
  - build Mind Games' `PhaseStrip` on the kit's: its parts, line and announcement stay in the
    game. `strip.css` goes away;
  - take `clockText` from the kit in place of `@smg/game-sdk`'s.
- **Bingo Royale:** keeps its header during a round, as today. The game bar is there if the owner
  wants a focus mode for Bingo.

## [0.5.0] - 2026-11-21

The frames a game fills: "before the round" and "the result". The words, icons, placings and
standings stay in the games.

### Added

- `StartCard` (`@seasonal/kit/react`):
  - the card in the round's season colour (`season` null: a seasonless game);
  - slots for the game's icon, badge, special and facts;
  - "Opens in N s" as a quiet timer;
  - fitted to the screen with the game's floors.
- `ResultFrame` (`@seasonal/kit/react`):
  - the first part one screen high: headline (two lines at most), lines, proof, the reveal
    taking the free height, and the game's placings, beside the reveal on a desktop;
  - `more` below it;
  - `layout` board keeps the part's full height; `fitted` shrinks it where it has not the room
    (off by default).
- `@seasonal/kit/frames.css`: both frames, the season tints from the website's colours, and
  both filling the height above the chat inside `DockedScreen`. `--sk-result-top` is the game's
  bar height above the result.

### Changed

- `tests/fit-floors.test.ts` checks the scaled `font-size`s of every kit stylesheet (it read
  every `max()` floor before, a box's size too).
- `docs/DELIVERY.md` records the v0.4.1 proof.

### Migration, per game

- **Mini Games:** once it pins v0.5.0, it may:
  - build `round/RoundIntro.tsx` on `StartCard`: its season icon, special, facts and halving
    badge go in as slots, and its `roundIntro.css` goes away. Its `--font-size-ball` is the
    card's `--sk-start-title`, the same value;
  - build `round/ResultScreen.tsx`'s first part on `ResultFrame` (`fitted` where it has
    "Closest to winning", as today), and drop those rules from `round/result.css`. Its placings
    table, proof, team line and standings stay its own. It sets `--sk-result-top` from its
    `--result-top`. Its own result (`ownResult`) stays its own.
- **Bingo Royale:** once it pins v0.5.0, it may put its final placement in `ResultFrame`, with
  its podium as `placings` and its rows as `more`. Its round has no season card, so `StartCard`
  is for a later start screen, which needs the owner's word.

## [0.4.1] - 2026-11-21

### Fixed

- `DockedScreen` on a phone no longer throws where the browser has no `window.visualViewport`
  (undefined, as in jsdom, a game's tests): it then leaves the height to the layout. Found by
  the v0.4.0 delivery proof (docs/DELIVERY.md). Nothing changes for a game that pinned v0.4.0
  except that its phone tests no longer crash.

## [0.4.0] - 2026-11-21

The screen building blocks: React over the kit's core, as `@seasonal/kit/react` (React 19.3.1
is an optional, exactly pinned peer dependency; SECURITY.md).

### Added

- Fitting to the screen (DECISIONS K14):
  - `useFitScale(game, signature, self?)` (`@seasonal/kit/react`): Mini Games' O111 scale `--fit`
    with the game's floor. Bingo's floor is 1, so its screens never shrink, as today.
  - `@seasonal/kit/fit.css`: each game's floors (`data-sk-game`): Mini Games 13 px text, 24 px
    display values, 22 px rows, 40 px phone targets; Bingo 14 px text, 44 px targets. With no
    game named, the strictest of all. `tests/fit-floors.test.ts` is the floor guard.
- The docked chat (`@seasonal/kit/react`, `@seasonal/kit/dock.css`):
  - `DockedScreen`: the game's content on top, the dock under it, mounted once, so the chat
    survives the round → result switch; on a phone the box follows the visible viewport.
  - `ChatDock`: the 190 px strip (150 px under 760 px high) with the call slot at its right end;
    on a phone the bar with the newest message and the unread count, its sheet, and the 48 px
    call strip above it. The slot is hidden while no call id is set.
  - `WebsiteChatFrame`: the website's chat frame on the checked link (`connectChat`).
    `sandboxed` is the game's choice. `useDockArrivals` for a game's own chat room;
    `useDockView`, the 900 px landscape rule.
- The shell (`@seasonal/kit/react`, `@seasonal/kit/shell.css`): `BackLink` ("← Seasonal
  Entertainment" to `/games`, website mode only), `ThemeToggle`, `useTheme`, `useShownTheme`,
  `useDisclosure`.
- `.claude/settings.json` allows `docker run --rm …` for the security pass (CONTRIBUTING.md).

### Changed

- `docs/DELIVERY.md` records the install and build of the tag v0.3.0, and its pin example names
  v0.3.0; `docs/security-pass.md` completes the v0.3.0 pass's install and package rows.
- `docs/DECISIONS.md`: K14 (the floors per game) and K15 (the unattended chain of 2026-11-21).

### Migration, per game

- **Mini Games:** once it pins v0.4.0, it may:
  - delete `packages/ui/src/useDisclosure.ts`, `apps/web/src/shell/ThemeToggle.tsx` and the
    hooks of `apps/web/src/shell/theme.ts`, for the kit's. Its bar's `order` rule moves from
    `.theme-toggle` to `.sk-theme-toggle`;
  - replace `useFitScale`, `nextScale`, `settle` and `FIT_FLOOR` in `apps/web/src/round/useFit.ts`
    with `useFitScale('mini-games', signature, self)`. Its `useFit` (the "+N more" count) stays;
  - put `data-sk-game="mini-games"` around its screens and write its floors as
    `var(--sk-floor-…)`; the values stay the same;
  - replace `match/DockedMatch.tsx`, `match/ChatDock.tsx`, `match/chatDock.css` and the dock's
    rules in `match/docked.css` with `DockedScreen`. Its room reports through `useDockArrivals`
    in place of `ChatArrivals`; its phone field is the `field` prop;
  - replace `HostChat` (`chat/ChatPanel.tsx`) and `chat/useHostChatFrame.ts` with
    `WebsiteChatFrame room="mini-games" sandboxed`;
  - add `BackLink` at the top left (GAME-INTEGRATION §8).
- **Bingo Royale:** once it pins v0.4.0, it may:
  - delete `apps/web/src/shell/ThemeToggle.tsx` and its `.theme-toggle` rules, and the
    `.shell-back` link and rules, for `ThemeToggle` and `BackLink`. Its bar's `order` rules move
    to `.sk-theme-toggle` and `.sk-back-link`;
  - use `WebsiteChatFrame room="bingo" sandboxed={false}` in its side panel
    (`shell/ChatDock.tsx`). The frame now also sends `strict-origin`, as GAME-INTEGRATION §5
    requires;
  - keep its own `--gutter` and `--panel-padding` after the kit's tokens: they differ from Mini
    Games' below 356 px of width (docs/ADOPTION.md);
  - put `data-sk-game="bingo"` around its screens. Its docked layout would replace the side
    panel, which needs the owner's word.

## [0.3.0] - 2026-11-20

The game side of the website integration, framework-free (React wrappers: docs/BACKLOG.md 9).

### Added

- Website sign-in (`@seasonal/kit`):
  - `websiteSignInHref` (the game's sign-in route) and `websiteLoginHref` (its login hop), each
    with the page shown as `next`;
  - `signInAgain` and `signInAgainAfter(response, header)`: at most once a minute per tab and
    route, never without storage, and never to a route that is not a path on this site.
- The chat embed (`@seasonal/kit`):
  - `chatEmbedUrl(room, theme, path?)`: the embed page on this site, relative;
  - `connectChat`: the typed `seasonal-chat` / `seasonal-chat-host` link. It checks origin,
    window and `source` on every message, parses `ready`, `unread` and `resize` with all their
    fields, and ignores anything else. It sends `visible` (again on every `ready`) and `theme`,
    only at the chat's origin.
- The arrivals (`@seasonal/kit`): `createChatArrivals` (unread count and newest message) and
  `chatBarText`, for the docked strip and the phone chat bar.
- The call-view slot:
  - `@seasonal/kit/call.css`: `sk-call-slot` with `--collapsed`, `--strip` and `--phone`, at
    338 × 190, 267 × 150 under 760 px high, a 48 px column, and a 48 px phone strip;
  - `callSlot` and `CALL_SLOT` (`@seasonal/kit`): the same sizes, null while no call is linked;
  - `connectCall` (`@seasonal/kit`): the typed `seasonal-call` / `seasonal-call-host` link,
    with the same checks, for the linked call only. Nothing is framed yet: the site's page does
    not exist (docs/BACKLOG.md 8).
- The security pass's section on the message layers (`docs/security-pass.md`).

### Changed

- `docs/DELIVERY.md` records the install and build of the tag v0.2.0 itself, after the branch.
- `docs/DECISIONS.md`: K9–K13, the owner's confirmations (the five font weights, the first
  security pass, the licence, PR #4) and master's branch protection; K7 now comes before K8.
- `.claude/settings.json`: the kit's Claude Code permissions, explained in `CONTRIBUTING.md`.

### Migration, per game

- **Mini Games:** once it pins v0.3.0, it:
  - deletes `packages/ui/src/websiteSignIn.ts` and its test, and imports `websiteSignInHref`,
    `signInAgain` and `signInAgainAfter` from the kit. `signInAgainAfter` now takes the header:
    `signInAgainAfter(response, 'x-smg-session-ended')`. The loop guard's sessionStorage key
    becomes `sk.signInAgainAt:<route>`, so a guard set just before the update is forgotten once.
  - drops `fromChat` and the post from `apps/web/src/chat/useHostChatFrame.ts`. The hook becomes
    a thin wrapper over `connectChat`, which also re-sends `visible` on `ready`. For the
    website's room, `withTheme` gives way to `chatEmbedUrl('mini-games', theme)`. A host chat on
    another origin keeps its own address and passes its `origin`.
  - replaces `useArrivals` and `barText` (`apps/web/src/match/ChatDock.tsx`) and the unread
    count in `apps/web/src/round/FocusShell.tsx` with `createChatArrivals` and `chatBarText`.
  - may reserve the call slot (`call.css`, `callSlot`), hidden while no call is linked.
- **Bingo Royale:** once it pins v0.3.0, it:
  - drops `websiteSignInHref(signInPath, hash)` from `apps/web/src/account/WebsiteSignIn.tsx`
    for the kit's `websiteLoginHref(signInPath)`. `next` is now the page's path, query and hash.
    It no longer adds `#/` to an empty hash; the base path is the same page, the lobby.
  - builds `useWebsiteResign` on `signInAgain(signInPath)`, which adds the once-a-minute guard.
    Its `leavePage` seam gives way to `signInAgain`'s `go` argument.
  - builds the frame's `src` in `apps/web/src/shell/ChatDock.tsx` with
    `chatEmbedUrl(room, theme, path)`: relative now, the same page as its `origin + path`. It may
    take `connectChat` to follow the theme by `theme` without reloading the frame, and to show
    `unread`.
- **Seasonal Party:** takes the frame's chat link and the call slot from the kit when it adopts
  it (DECISIONS K4).

## [0.2.0] - 2026-11-20

### Added

- `@seasonal/kit/fonts.css` and the five Luxora Grotesk woff2 files in `fonts/` (DECISIONS K8):
  - Book 400 and Bold 700, the two faces the games use;
  - Regular 500, Italic 400 and Light Italic 300, as the website declares them.

  The files are byte-identical to the Mini Games, Bingo Royale and website copies; sha256 values
  are in `fonts/README.md` and checked in the tests. They are not under the AGPL (licence note in
  `fonts/README.md`).

- The first security pass (`docs/security-pass.md`).

### Migration, per game

- **Mini Games and Bingo Royale:** once a game pins v0.2.0, it:
  - imports `@seasonal/kit/fonts.css` in place of its own `packages/ui/src/fonts.css`;
  - drops its own copy of the font files (`assets/fonts/luxora-grotesk-*.woff2`);
  - keeps `assets/README.md`'s licence note for the files it still holds, if any.
- **Seasonal Party:** takes the font for its frame from the kit (DECISIONS K4). Its round font
  stays inside the play field.

## [0.1.0] - 2026-11-20

### Added

- `@seasonal/kit/tokens.css`: the 49 design tokens Bingo Royale and Mini Games share with equal
  values, light and dark. The season colours and the text on them are copied from the website.
  CI fails when they differ from the website's master, and checks every text token for WCAG AA
  in both themes.
- `@seasonal/kit/motion.css`: the win glow `sk-anim-win` and the reduced-motion rule.
- `@seasonal/kit`: the framework-free theme logic: `resolveTheme`, `storedTheme`, `storeTheme`,
  `systemTheme`, `applyTheme`, `onSystemThemeChange`, `shownTheme`, `onShownThemeChange`.
- `@seasonal/kit/vite`: `themeInit()`, which serves the early theme script
  (`browser/theme-init.js`) at the base path, so a game drops its own copy in `public/`. `vite` is
  an optional peer dependency.
- The project standards: SECURITY, CONTRIBUTING, CLAUDE.md, the review checklist and the
  security pass; the living docs; Renovate, osv-scanner and gitleaks; the CI and CodeQL
  workflows; the pre-commit hook (format, lint, gitleaks).

### Migration, per game

- **Mini Games:**
  - import `@seasonal/kit/tokens.css` and `motion.css` before its own;
  - drop the 49 shared tokens from `packages/ui/src/tokens.css`;
  - rename `smg-anim-win` to `sk-anim-win`;
  - build `useTheme` and `useShownTheme` on the kit's theme functions;
  - add `themeInit()` to its Vite plugins and delete `apps/web/public/theme-init.js`.
- **Bingo Royale:** the same, except:
  - it keeps its own `sbr-anim-draw` and the ball keyframes;
  - its `motion.css` keeps only those;
  - it has no `useShownTheme`.
- **Fonts:** each game keeps its own `fonts.css` and font files (docs/BACKLOG.md item 7).

### Security

- minimatch 10.2.6 (GHSA-g3hv-75wg-m249, moderate, only in ESLint's tooling) is forced to 11.0.9
  in `pnpm-workspace.yaml`. osv-scanner finds nothing.

## [0.0.1] - 2026-11-20

### Added

- The delivery probe: the four season colours (`css/tokens.css`) and the theme resolution
  (`resolveTheme`), with `dist/` committed ([docs/DELIVERY.md](docs/DELIVERY.md)).

[Unreleased]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/weudlll-cyber/seasonal-kit/releases/tag/v0.0.1
