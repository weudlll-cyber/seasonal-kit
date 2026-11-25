# Changelog

All notable changes to `@seasonal/kit`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as [docs/RELEASING.md](docs/RELEASING.md)
applies it.

## [Unreleased]

## [0.27.0] - 2026-11-26

Fixes for what Seasonal Cases and Mini Games reported on v0.22.0.

### Added

- **`guardedFetch({ localOrigins })`**: exact origins from a game's server configuration that may
  be reached over plain http and at a private or container address; every other rule stays.
- **`writeCheck({ crossOrigin })`**: named writes another site's page may make, by method, exact
  path and exact origins; the request passes its `url`.
- **`securityHeaderSet`**: `frames` also takes an https origin followed by a path; `secure: true`
  adds `upgrade-insecure-requests`.
- **`--sk-bar-gutter`**: the game bar's inline padding at every width, for a game to set; unset, the
  bar looks as before.

### Changed

- **The security headers** add `script-src-attr 'none'`.
- **`guardedFetch` opens a connection of its own for every call**, so no pooled socket is used that
  its address check never saw (security pass).

### Fixed

- **The header's fold no longer depends on how the page got there** (K79). A header folded once
  stayed folded until the window grew past that width. Now it is measured again on a new window
  width, a change of its own size and loaded web fonts, always from the unfolded layout.
- **The backup units no longer point into the pnpm store.** `print-units` writes the path the
  script was called by, and refuses one inside `.pnpm`.
- **The Menu button no longer depends on the order of the kit's CSS files.** With `bar.css` after
  `header.css` it showed in an unfolded header.
- **A docked screen's content is reachable by keyboard.** `DockedScreen`'s scrolling box is a Tab
  stop, the region "Game screen" (axe `scrollable-region-focusable`).
- **The plain-http session cookie takes the base path** (development): it had `Path=/` whatever
  `basePath` said.
- **Docs:** `backup` needs Linux, a Windows drill runs in a Linux container (OPERATIONS.md); how
  Cases reads the season feed and what Mini Games' old backups need (ADOPTION.md); one CI run per
  push (HANDBOOK.md, K80); a website-mode game is framed by the website only (K81).

### Migration, per game

- **Bingo Royale:** if it uses `securityHeaderSet`, pass `secure: true` where served over https and
  check no page has an inline event handler (`onclick="…"`). Nothing else.
- **Mini Games:** with `securityHeaderSet`: `secure: true` over https, `mode: 'website'` in website
  mode (K81), `https://<website public host>/embed/chat` in `frames` in place of its own
  `frame-src` override, no inline event handler. `writeCheck`: list `POST /api/v1/auth/handoff`
  with the embed origins, pass `url: request.url`, drop the path exemption. Read
  `SMG_WEBSITE_LOCAL_URL` through `guardedFetch({ localOrigins })` and drop the account feed's
  plain fetch and `readLimited`. Set `--sk-bar-gutter: 0` where the page already has a gutter. Set
  `push.branches` to `[master]` in `.github/workflows/ci.yml`.
- **Seasonal Cases:** remove its own workarounds for the header fold, the Menu button and the
  docked content if it has any; call `node_modules/@seasonal/kit/ops/backup.sh print-units` when it
  takes the backup; move its account feed's plain fetch onto `guardedFetch({ localOrigins })`; with
  `securityHeaderSet`, `secure: true` over https; set `push.branches` to `[master]` in
  `.github/workflows/ci.yml`.

## [0.26.0] - 2026-11-26

The website's stand-in for the games' browser tests (DECISIONS K74). Opt-in, test code only.

### Changed

- **`ops/backup.sh` takes a database URL with its password** (K75): `SK_BACKUP_DB_URL` is split into
  the address and the percent-decoded password, passed as `PGPASSWORD`, never on a command line; a
  `password=` in the query is refused. A URL without a password works as before.

### Added

- **`startWebsiteStandIn`** in `@seasonal/kit/testing`: one local server that answers as the website
  and its proxy for a game: sign-in through the proxy with the identity headers and the game's secret,
  `/login`, the season feed, the game's open rounds as the website reads them, step icons, and the
  chat and call frames that speak the website's messages. From the website stand-ins of Mini Games,
  Seasonal Cases and Bingo Royale.

### Migration, per game

- **All three games:** nothing is required; see [docs/ADOPTION.md](docs/ADOPTION.md) "Since v0.26.0".
- **Seasonal Cases:** moves to Docker before production, then takes the kit's backup unchanged (K76).

## [0.25.0] - 2026-11-26

Operations parts (DECISIONS K71 onwards). Opt-in; nothing runs unless a game runs it.

### Added

- **`latencies`, `inBatches` and `watchServer`** in `@seasonal/kit/testing` (K73): the load check's
  measuring helpers from Bingo Royale's and Mini Games' `load/`; scenarios stay in the games.
- **`ops/lib/website-route.sh`** (K72): the installer's route-file step of a website install, for nginx
  and Caddy, from Mini Games' `website-route.sh` (itself from Bingo Royale's): writes the game's own
  route file, checks, restores on refusal and reloads. Tested against the real nginx and Caddy,
  imported as the website's configuration imports it.

### Changed

- **`ops/backup.sh` is split** (K71): the entry sources `ops/lib/backup-core.sh` and
  `ops/lib/backup-restore.sh`, which ship in the package. Same commands, variables and behaviour.

### Migration, per game

- **All three games:** nothing is required; each part is listed in
  [docs/ADOPTION.md](docs/ADOPTION.md) under "Since v0.25.0".

## [0.24.0] - 2026-11-26

Client parts (DECISIONS K68 to K70). Every one is opt-in; a game that changes nothing sees today's
behaviour.

### Added

- **`createApiClient`, `ApiError`, `basePathOf`** (main entry) and **`useApiGet`** (React) (K70): one
  client for a game's own server calls with one error shape, and a hook for one GET answer. From
  Bingo Royale's and Mini Games' `shell/http.ts` and their loading hooks.
- **`clockOffset`, `useCountdown` and `StartCard`'s `opensAt`** (K69): a countdown on the server's clock,
  the visitor's offset measured from answers that carry the server's time; nothing shows until it is
  measured. From Mini Games' clock sync and Bingo Royale's countdown.
- **`StepBadges`** and `steps.css` (K68): the header's step badges beside any name, for boards, player
  lists and lower thirds. The header uses it; `header.css` brings `steps.css` along, and the header
  looks as before. From the three games' own badge components.

### Migration, per game

- **All three games:** nothing is required; each part is listed in
  [docs/ADOPTION.md](docs/ADOPTION.md) under "Since v0.24.0".

## [0.23.0] - 2026-11-26

Test tools for the games' own suites, in a new entry `@seasonal/kit/testing` (DECISIONS K66). Opt-in:
no other entry imports it and no game changes until it uses it.

### Added

- **`setTheme`, `settle`, `captureLook`, `DESKTOP`, `PHONE` and `SWEEP_SIZES`**: the theme switch and
  the screenshots of a look in a browser test, from Bingo Royale's and Mini Games' `e2e/screens.ts`.
- **`findFixedColours`, `findSmallText` and `findLowContrast`**: static guards a game calls from its own
  Vitest test, from Bingo Royale's `noFixedColours`, `minTextSize` and `designTokens` tests.
- **`probe`, `sweep` and `axeFinder`** (K67): one call that walks a game's screens at seven sizes, 100 %
  and 200 % root font, light and dark, with axe, and fails on sideways scroll, a box past the window,
  cut text, a control under 44 px or a fitted root that cuts a part. From Bingo Royale's fit probe and
  the size loop pasted into its specs. Proved on the kit's own screens in `showcase/testing.spec.ts`.
- **`@playwright/test`** is an optional peer, for the entry's types.

## [0.22.0] - 2026-11-26

The fixes from Seasonal Cases' measurements of its kit adoption (DECISIONS K65): Cases' own CSS
patches move into the kit, each proved by a measurement in `showcase/cases.spec.ts`.

### Changed

- **The folded header's brand keeps its longest word** (`css/header.css`): `min-width:
min-content` instead of 0, the basis still 0. At 360 px and 200 % font its two-line name no longer
  runs under the Menu button; the Menu and the toggle take a row of their own below it when they do
  not share one. Where they fit one row nothing moves.
- **The back link's words may wrap on a phone** (`css/shell.css`): at 200 % font they were 288 px
  wide on one line and pushed the header, the folded menu and the account chip past a 360 px window.
- **The game bar's facts wrap instead of ending in "…" on a phone** (`css/bar.css`), never narrower
  than their widest word, and the bar wraps its items, so its buttons keep one row. **The bar has
  inline padding of its own now** from the gutter tokens: the page's gutter on a desktop, 0.5rem on a
  phone, 0.25rem at 400 px and under. **Every game's bar changes look when it adopts this**: a fact
  that was cut off now shows whole, on a second line, and a game that added its own bar padding
  deletes it.
- **`StartCard`'s `opensIn` is optional** (`src/react/StartCard.tsx`): without it the card has no
  countdown; with it, as before.

### Checked, unchanged

- The header unfolds where Cases' items fit: its bar folds at 1280 and 1536 px because opened it
  needs two rows, and stays unfolded from about 1700 px. Nothing was fixed; the measurement is in the
  showcase. Cases' brand rule changes no box at 1280, 1536 or 1920 px.
- The folded account chip with a 24-character name, a rank and three steps fits the menu panel and
  the window from 320 to 390 px at 100 % and 200 % font.

### Migration, per game

- **Seasonal Cases:** delete the four patches (`shell.css` 195 and 204, `moments.css` 27-56,
  `screens.css` 41) and leave `opensIn` out of its start card.
- **Mini Games, Bingo Royale:** nothing is required; the bar's wrapped facts and its own padding show
  on adoption (see [docs/ADOPTION.md](docs/ADOPTION.md)).

## [0.21.0] - 2026-11-26

The shared server parts of the three games, as opt-in parts of the kit (DECISIONS K60 to K64, from
[docs/concepts/shared-server-parts.md](docs/concepts/shared-server-parts.md)). Nothing existing
changes: a game that changes nothing sees today's behaviour, and it adopts each part on the owner's
word, as [ADOPTION.md](docs/ADOPTION.md) says. A new entry in the package: `ops/`.

### Added

- **`HEALTH_PATHS` and `readiness`** in `@seasonal/kit/server` (DECISIONS K64): the route names
  `/healthz` and `/readyz` and the readiness answer (200 ready, or 503 unavailable when the probe
  fails or is later than 1.5 s, the error beside the body and never in it), from Bingo's and Mini
  Games' `routes/health.ts`. No game changes until it adopts.
- **`sessionCookie`, `sessionCookieOptions`, `writeCheck`, `securityHeaderSet`, `renderPolicy` and
  `securityHeadersHook`** in `@seasonal/kit/server` (DECISIONS K63, K60): the session cookie's name
  and attributes with a `Max-Age` equal to the session's absolute length (Bingo's); the CSRF check for
  state-changing requests (`Sec-Fetch-Site`, `Origin` against the request's host, the forwarded host
  believed only from the trusted proxy's TCP peer, a write naming neither refused; from Cases'
  `sameSiteWrites`); and the security headers as data (Bingo's strict policy with Mini Games'
  ancestors and admin rules, no HSTS) with a Fastify hook. No game changes until it adopts.
- **`guardedFetch` and `isPublicAddress`** in `@seasonal/kit/server` (DECISIONS K62): a fetch with
  the shape `seasonFeedReader` takes, that connects only to public addresses (checked inside the
  socket's lookup, so DNS rebinding cannot pass), https only, no redirects, a timeout over the whole
  exchange and a body limit, `allowedHosts` and `allowLocal` (development) as options. Taken from
  Mini Games' `safeFetch.ts` and `safePost.ts`; adds the hex form of an IPv4-mapped IPv6 address and
  the reserved, benchmarking, documentation, 6to4 and NAT64 ranges. Property tests over addresses.
- **`ops/backup.sh`, `ops/pull-backups.sh`, `ops/pull-backups.ps1`** (DECISIONS K61, shipped in the
  package, [docs/OPERATIONS.md](docs/OPERATIONS.md)): encrypted backups of a game's PostgreSQL, its
  uploads volumes and its secret files (age, to the operator's public key; 14 newest and 8 weekly
  kept), a restore that refuses another environment's backup (by name and by manifest) and runs in one
  transaction, a restore drill in a throw-away PostgreSQL container that compares each table with the
  dump, and the systemd units for the nightly timer. Taken from Bingo Royale's `ops/lib/backup.sh`
  (the rehearsed one) and Mini Games' drill; settings are `SK_BACKUP_*` variables. No secret, key or
  dump is printed. Tested on a real PostgreSQL container in CI (job `ops`, not a required check).

### Migration, per game

- **All three games:** nothing is required. Each part is listed per game in
  [docs/ADOPTION.md](docs/ADOPTION.md) under "Since v0.21.0": what it replaces and how.
- **Seasonal Cases:** has no backup today; it takes `ops/backup.sh` first.
- **Mini Games:** its cookie outlives a website session by 23 days; `sessionCookieOptions` fixes it on
  adoption (recorded in K63).

## [0.20.0] - 2026-11-26

The owner's answers on four proposals of the night audit of 2026-11-25 (DECISIONS K58, K59). Every
change is opt-in or invisible: a game that changes nothing sees today's behaviour.

### Added

- **`BarAction.controls`**: the id of the panel a game bar button opens, written as the button's
  `aria-controls` (audit A-02). Left out, the button has none, as before.
- **`"sideEffects": ["**/*.css"]`** in `package.json` (A-29): a bundler may drop unused kit
  JavaScript and always keeps a stylesheet a game imports. The delivery proof bundles a consumer
  and shows its CSS is in the output.

### Changed

- **The call frame's `referrerPolicy` is `strict-origin`** (A-17), as the chat frame's: the site
  learns the origin, not the path of the game's page.
- **`fonts/README.md` records the copyright holder** read from the font files' own name table (A-01):
  Fontastica, 2021.

### Migration, per game

- **Mini Games, Seasonal Cases:** optional: pass `controls` on a bar action for `aria-controls`.
- **Bingo Royale, Seasonal Party:** nothing.

## [0.19.1] - 2026-11-25

The night's clean-up (DECISIONS K57): nothing in the public API changed (the shipped `dist/` is
byte for byte the one of v0.19.0), and no game has to do anything.

### Changed

- **Night audit** (2026-11-25; [docs/AUDIT-2026-11-25.md](docs/AUDIT-2026-11-25.md); nothing a game
  sees changes in its API): `css/frames.css` writes the three result cards' chrome once;
  `css/motion.css`'s glow takes `--sk-color-autumn` instead of the same colour as a literal; in the
  folded header menu a long account chip now wraps inside the panel instead of running up to 130 px
  past a 320 to 375 px phone (it did so before the steps too); README names ten exported values it
  left out; the CI jobs have time limits. New tests: property tests of every parser of outside
  input (fast-check 4.11.0, a new exact devDependency), tests for the edges that mutation testing
  found unguarded (the mutation score of 16 security-critical modules rose from 88.5 % to 94.7 %),
  a leak test for every React part, a literal-colour test for the kit's CSS, a test of the workflow
  rules, and browser specs for the keyboard, focus, reduced motion and the longest account chip.
  `docs/concepts/shared-server-parts.md` compares what the three games each built.
- **Working rules** (CLAUDE.md, docs only): a "Working cheaply" section (owner decision of
  2026-11-23: the saving rules apply to every Seasonal project), the test-file limit of 400
  lines, and the `data-sk-` prefix next to the class rule. BACKLOG 2 and 9 close the parts a
  game's `master` uses (Bingo's `WebsiteChatFrame`). `logs/` is git-ignored.
- **The handbook is current** (docs only, DECISIONS K51, K52): `docs/HANDBOOK.md` follows
  v0.12.0 to v0.17.0, has the sections "How a Seasonal game looks" and "Before production", the
  working-cheaply rules, HSTS and `FailureBrake` in Security, privacy from the first commit,
  "The first day", the load target, a glossary, and each rule names its check. Decisions K53
  (English to players) and K54 (AGPL-3.0-or-later) are recorded.
  RELEASING step 1 now updates it with every release.
- **The website keeps its own sign-in brake** (docs only, DECISIONS K49): it does not move to
  `FailureBrake`. BACKLOG 19 is closed as decided.

## [0.19.0] - 2026-11-24

One addition (DECISIONS K56), opt-in: a header whose account has no `steps` is as before.

### Added

- **A member's step badges in `AppHeader`** (Seasonal Cases, decided 2026-11-24): `HeaderAccount`
  has an optional `steps`, in the kit's `Step` shape (`ladder`, `name`, `icon`) that the server's
  `identityFrom` already gives. The account chip draws each as a small icon (1.25rem, 20 px at the
  default size, growing with the font) after the name, named by the step, at most three, and the
  folded menu shows them beside the name too. An icon is drawn only if its address is exactly the
  website's file, "/media/step-icons/<32 hex>.webp"; any other address, and a step with no icon,
  is dropped. `css/header.css` has `.sk-header-steps`, `.sk-header-step` and `--sk-step-icon`. The
  showcase has a header with three steps, measured at 1280, 1536, 1920 and 390 px in light and
  dark (`showcase/steps.spec.ts`).

### Changed

- **The `Step` type, `MAX_STEPS` and the icon check moved** from `src/server/steps.ts` to
  `src/stepShape.ts`, which holds no server code, so the header imports them without pulling
  server code into a browser bundle. `@seasonal/kit/server` still exports `Ladder`, `Step` and
  `StepsMode` unchanged; `stepsFrom` applies the same check as before (`isStepIcon`).

### Migration, per game

- **Seasonal Cases:** pass the member's steps as `account.steps` to `AppHeader`, and drop any
  stand-in for the badges.
- **Bingo Royale, Mini Games, Seasonal Party:** nothing to do; the field is available and
  optional.

## [0.18.0] - 2026-11-24

One addition (DECISIONS K55), opt-in: a game that changes nothing sees today's behaviour.

### Added

- **`ResultFrame` `fit`** (Mini Games T423): an optional prop of the existing `FitOptions` type,
  passed to `useFitScale` as it is, as `StartCard`'s since v0.16.0. `fit={{ afterFonts: true }}`
  fits the frame again once web fonts have loaded; it matters where the frame is `fitted`, since
  an unfitted frame is not watched. Without the prop the frame behaves exactly as before.

### Migration

- **Mini Games:** pass `fit={{ afterFonts: true }}` to `ResultFrame` and delete `useFontLoads`
  from the result frame's signature at the next kit adoption.
- **Bingo Royale, Seasonal Cases:** nothing.

## [0.17.0] - 2026-11-24

A bug fix (DECISIONS K50). No game has to change anything.

### Fixed

- **The open phone chat sheet is never taller than the space visibly left above the bar.** Found on
  a real phone (Chrome on Android, large system font, Mini Games on v0.15.0): with the sheet open,
  the keyboard pushed the sheet's head (title, Close) and its messages off the top of the screen,
  and only the input stayed visible. `css/dock.css` gave the sheet `min(60dvh, 30rem)`; `dvh` does
  not shrink for the on-screen keyboard there and `30rem` grows with the font, while
  `DockedScreen` publishes `--sk-visible-height` from `visualViewport` and the bar moves up with
  the keyboard. The sheet now also has a `max-height`: `--sk-visible-height` minus the dock's own
  height (a call strip above the bar counts), its margin, the gap above it and the sheet's own
  padding and border. The head with Close does not shrink; the messages shrink and scroll inside.
  Where the space is enough the sheet is as before (60 % of the window, at most 30rem). Without
  `DockedScreen` there is no `--sk-visible-height`, the fallback is `100dvh`, and the old height
  decides. Three custom properties name the dock's margin (`--sk-dock-margin`), the sheet's gap
  (`--sk-sheet-gap`) and its border (`--sk-sheet-border`), so the cap reuses the values the layout
  uses. `showcase/sheet.spec.ts` measures it at 375 × 667 and 390 × 844 with a 200 % root font; a
  real keyboard is not emulated.

### Migration, per game that docks the chat

- **Mini Games, Bingo Royale, Seasonal Cases (and Seasonal Party when it adopts the dock):**
  nothing to change; take the version. The game's root must follow the visible height
  (`height: var(--sk-visible-height, 100dvh)`, as ADOPTION.md says), because the cap counts from
  its bottom. Whether to add `interactive-widget=resizes-content` to the viewport meta is answered
  in [docs/concepts/dock-bar.md](docs/concepts/dock-bar.md): not needed.

## [0.16.0] - 2026-11-24

One addition (DECISIONS K48), opt-in: a game that changes nothing sees today's behaviour.

### Added

- **`StartCard` `fit`** (Mini Games T404 and T423): an optional prop of the existing `FitOptions`
  type, passed to `useFitScale` as it is. `fit={{ afterFonts: true }}` fits the card again once
  web fonts have loaded. Without the prop the card behaves exactly as before.

### Migration

- **Mini Games:** pass `fit={{ afterFonts: true }}` to `StartCard` and delete the start card's own
  font-load counting at the next kit adoption.
- **Bingo Royale, Seasonal Cases:** nothing.

## [0.15.0] - 2026-11-24

Three additions from the games' requests (DECISIONS K46, K47). Every one is opt-in: a game that
changes nothing sees today's behaviour.

### Added

- **`FailureBrake`** in `@seasonal/kit/server` (K46, Seasonal Cases BACKLOG 49): `braked(key)`
  looks without counting, so a route refuses before the password check; `failed(key)` counts one
  wrong password; a success is not counted. A key holds at most `limit` failure times inside a
  sliding `windowMs`, and the brake lifts as the oldest ages out. It takes the rate limiter's rule
  (a whole limit ≥ 1 over a whole window, read once into a copy) and conventions: short,
  normalised keys the game passes (an account id, an IPv6 /64; never a raw login), a map of at
  most 100 000 keys with idle keys forgotten every 1000 failures and a throttled scan when full,
  a new key refused (`braked` is true) while every held key is active, a clock passed in. The
  rules and the keys stay in each game.

- **`ResultFrame` without a reveal** (BACKLOG 17, K42): a null or missing `reveal` renders no
  reveal box, and the frame sets `data-sk-reveal="none"`, on which `css/frames.css` lays the
  first part out in one column at every width (the proof still beside the headline on a desktop).
  The `reveal` prop is now optional. A game that passes a reveal sees exactly today's layout.
- **`ResultFrame` `middle`** (BACKLOG 12, Mini Games T417): an optional card of its own between the
  first part and `more` (`sk-result-middle`, styled as the "more" card), fixed in the fitting like
  the first part. Without it the frame is as before.
- **The showcase** has two more result states (no reveal, with a middle card), and
  `layout.spec.ts` measures them at 1280, 1920 and 390 px.

### Changed

- **Decisions, no code:** no merged single-card result option (K47, BACKLOG 20): Bingo drops its
  own `results.css` overrides at its next adoption. The dock bar's padding and field are measured
  and left as they are (BACKLOG 13, concepts/dock-bar.md); Mini Games measures again in the real
  game and reports back.
- **BACKLOG:** item 9 is back in part one (the v0.13.0 edit had removed it by mistake).

### Migration, per game

- **Seasonal Mini Games:** pass its `Guesses` card (the "Closest to winning" card or its history
  panel) as `middle`, and keep marking it as it does today; nothing else changes.
- **Seasonal Bingo Royale:** at its next kit adoption load `frames.css` for the result, leave
  `reveal` out, and drop the `display: contents` and `display: none` overrides of `results.css`
  (K47).
- **Seasonal Cases:** nothing for the result (it has a reveal and no middle part).
- **Seasonal Cases (sign-in):** replace the `FailureBrake` class of `apps/server/src/auth/failureBrake.ts`
  with `import { FailureBrake } from '@seasonal/kit/server'`; keep `SignInBrake` (its three keys and
  limits). Difference: with a full map the kit refuses a new key and keeps every held key's count;
  Cases' copy evicted the oldest key.
- **Bingo Royale:** at its next kit adoption, move its login limits onto `FailureBrake`: ask
  `braked(key)` before the password check, call `failed(key)` on a wrong one.
- **Mini Games, Seasonal Party:** use it for the failed sign-ins of their own login when they adopt
  the server entry; nothing changes until they do.

## [0.14.0] - 2026-11-24

**A breaking change for every game** (DECISIONS K45, BACKLOG 11): the 49 shared custom properties
take the `--sk-` prefix. Released after the owner's review.

### Changed

- **Every custom property of `css/tokens.css` is `--sk-` prefixed**, and every use in the kit's
  CSS (`bar`, `dock`, `fonts`, `frames`, `header`, `shell`) follows. `--sk-floor-text` and the
  other `--sk-` properties are as they were. `--fit` (the screen's scale, set on a game's own
  element by `src/fit.ts`) keeps its name.
- **tests/prefix.test.ts checks custom properties too**: every one a stylesheet declares or reads
  is `--sk-…`, except `--fit`.
- **The season check** reads the kit's `--sk-color-spring` … `--sk-color-on-season` against the
  website's `--color-spring` … `--color-on-season` (the website's names do not change).

### Migration, per game

The names are the same for every game; this table is each game's list. A game's own tokens
(arena colours, marks, its own `--gutter` where it differs) are not the kit's and keep their
names unless the game wants the kit's value: `--gutter: var(--sk-gutter)`.

| Old name                  | New name                     |
| ------------------------- | ---------------------------- |
| `--color-warning-surface` | `--sk-color-warning-surface` |
| `--color-border-strong`   | `--sk-color-border-strong`   |
| `--font-weight-heading`   | `--sk-font-weight-heading`   |
| `--sidebar-background`    | `--sk-sidebar-background`    |
| `--font-weight-strong`    | `--sk-font-weight-strong`    |
| `--color-background`      | `--sk-color-background`      |
| `--color-text-muted`      | `--sk-color-text-muted`      |
| `--font-weight-body`      | `--sk-font-weight-body`      |
| `--color-on-season`       | `--sk-color-on-season`       |
| `--page-background`       | `--sk-page-background`       |
| `--color-surface-2`       | `--sk-color-surface-2`       |
| `--color-active-bg`       | `--sk-color-active-bg`       |
| `--font-size-small`       | `--sk-font-size-small`       |
| `--font-size-title`       | `--sk-font-size-title`       |
| `--color-on-solid`        | `--sk-color-on-solid`        |
| `--font-size-body`        | `--sk-font-size-body`        |
| `--font-size-lead`        | `--sk-font-size-lead`        |
| `--color-on-live`         | `--sk-color-on-live`         |
| `--color-surface`         | `--sk-color-surface`         |
| `--color-success`         | `--sk-color-success`         |
| `--shadow-raised`         | `--sk-shadow-raised`         |
| `--content-width`         | `--sk-content-width`         |
| `--duration-fast`         | `--sk-duration-fast`         |
| `--duration-base`         | `--sk-duration-base`         |
| `--duration-slow`         | `--sk-duration-slow`         |
| `--color-spring`          | `--sk-color-spring`          |
| `--color-summer`          | `--sk-color-summer`          |
| `--color-autumn`          | `--sk-color-autumn`          |
| `--color-winter`          | `--sk-color-winter`          |
| `--color-border`          | `--sk-color-border`          |
| `--color-danger`          | `--sk-color-danger`          |
| `--color-accent`          | `--sk-color-accent`          |
| `--color-glass`           | `--sk-color-glass`           |
| `--color-solid`           | `--sk-color-solid`           |
| `--color-scrim`           | `--sk-color-scrim`           |
| `--font-family`           | `--sk-font-family`           |
| `--radius-card`           | `--sk-radius-card`           |
| `--radius-pill`           | `--sk-radius-pill`           |
| `--color-live`            | `--sk-color-live`            |
| `--color-card`            | `--sk-color-card`            |
| `--color-text`            | `--sk-color-text`            |
| `--hit-target`            | `--sk-hit-target`            |
| `--ease-out`              | `--sk-ease-out`              |
| `--space-1`               | `--sk-space-1`               |
| `--space-2`               | `--sk-space-2`               |
| `--space-3`               | `--sk-space-3`               |
| `--space-4`               | `--sk-space-4`               |
| `--radius`                | `--sk-radius`                |
| `--gutter`                | `--sk-gutter`                |

- **Seasonal Mini Games:** replace each old name in its CSS and TSX (`var(--color-text)` becomes
  `var(--sk-color-text)`); its own tokens (`--font-size-ball`, arena, marks) stay.
- **Seasonal Bingo Royale:** the same replacement in `header.css`, `results.css` and its other
  files that read the kit's names; its own `--gutter` and `--panel-padding` stay as its own, and
  may read `var(--sk-gutter)`.
- **Seasonal Party (Seasonal Spirits):** the same replacement in the frame's CSS that reads the
  kit's tokens.
- **Seasonal Cases:** the same replacement in `packages/ui` and `apps/web`; its `pending/` CSS
  too.
- **Every game:** search the game for each old name as `var(--old` and as `--old:`; a game that
  defines a token of the same name for itself no longer collides with the kit's.

## [0.13.0] - 2026-11-24

Additions for Bingo Royale's and Seasonal Cases' requests (DECISIONS K40, K41 and the Cases
items 41, 43 and the call view, BACKLOG 8). Every one is opt-in, or a default no game sees where
it loads `fit.css`.

### Added

- **`AppHeader` `foldBelow`** (K40): `foldBelow={960}` folds the header into its Menu button
  under that window width in px, whatever the items measure; from it up the measured fold
  decides as before. Without it nothing changes.
- **A default for `--sk-floor-text`** (K41): `css/tokens.css` has `:where(:root) {
--sk-floor-text: 14px }`, the strictest text floor of all games, so the header, the bar and
  the dock have a floor for a game that loads no `fit.css`. It has zero specificity, so where
  `fit.css` is loaded its values win in any import order. It is not one of the 49 shared tokens.

- **A press action in `GameBar`** (`presses`, Cases 41): `presses={[{ id, icon: 'applaud', label,
onPress, tip? }]}` adds a button that only sends a press, after the toggles and before the
  panel buttons. It has the bar's button and icon parts, no `aria-expanded` and no
  `aria-pressed`. `applaud` (two clapping hands) is its first icon (`BarPressIconName`).
- **Opening the docked chat from the game** (`useOpenDockChat()`, Cases 43): inside a
  `DockedScreen`, it returns a stable function that opens the dock's chat: the sheet on a phone
  (which takes the focus), the focus into the strip on a desktop. It does nothing outside a
  docked screen or in one `withoutChat`. `useDisclosure` gains `show` (open and stay open).

- **The call view in the slot** (BACKLOG 8, K44): with a call id, `ChatDock` (so `DockedScreen`)
  frames the website's call view in its slot: `callEmbedUrl(callId, theme, path?)` builds
  `/embed/call/<id>?theme=`, and `CallFrame` frames it with `allow="autoplay; fullscreen"` and
  nothing more, sandboxed as the chat's frame (plus popups that leave the sandbox, for "Open
  the call page"). The slot follows the view: a `resize` to its other form moves the slot to
  that form (a phone starts in the 48 px strip), `ended` hides it and the game goes on.
  `ChatDock` takes `callPath` for a game's own embed path. No call id, nothing framed, as before.
  The kit's `connectCall` was checked against the website's own sender (`EmbedCallPage.jsx`,
  `callView.js`, `joinRoutes.js` at seasonal-entertainment `e11b3eb`): sources, six messages,
  their fields and the error codes all agree, so the message layer is unchanged.

### Migration, per game

- **Every game that passes a call id to `ChatDock` or `DockedScreen`:** the slot now holds the
  view, where it was empty. A game that passes `callId={null}` sees no change. Add the stylesheet
  `call.css` (the frame's `sk-call-frame` fills the slot).
- **Seasonal Cases:** delete `packages/ui/src/pending/BarPress.tsx` and `useChatHandOver.ts`; use
  `GameBar`'s `presses` for "Applaud" and `useOpenDockChat()` for the Chat button.
- **Bingo Royale:** pass `foldBelow={960}` to `AppHeader` and drop the `max-width: 959px` fold
  rules of `header.css`; the text floor now comes from `tokens.css`, so its own small-type
  overrides may stay or go.
- **Mini Games, Seasonal Party, Seasonal Cases:** nothing to do (they load `fit.css`, whose
  floors win).

## [0.12.0] - 2026-11-23

Five additive answers to Seasonal Mini Games' adoption requests (its O143, T414, O144/T415,
T416). Every change is opt-in: a game that changes nothing sees exactly today's behaviour.

### Added

- **A `prefs` icon for `GameBar`** (`BarIconName`): three vertical sliders on the same 24 × 24
  grid and stroke as chat, players and host, for Mini Games' Pre-picks button (O117).
- **A back link in `GameBar`** (`back`, K39): `back={{ websiteMode }}` puts the shell's
  `BackLink` (reused, not a second link) at the start of the row. A desktop shows arrow and
  words; a phone shows the arrow alone in a 44 px target, the words as its accessible name
  (`sk-back-words`, visually hidden), so it fits beside the season pill. Without the prop, and in
  standalone mode, the bar is unchanged. `BackLink`'s words are now their own `<span>`; its look
  and text are the same.

- **A refit after web fonts** (`afterFonts`): `watchFit(root, game, self, { afterFonts: true })`
  and `useFitScale(game, signature, self, { afterFonts: true })` fit again on `document.fonts`
  `loadingdone` and once `fonts.ready` settles, in the next frame, as for a new size. Text set
  in a late font changes height without the box changing size (Mini Games T404, a WebKit wrap
  32 px over the card). Off by default; where there is no font set nothing is listened to.
  `FitOptions` is exported from `@seasonal/kit`.

- **`DockedScreen` without a chat** (`withoutChat`): the screen renders its content and no dock
  at all (no strip, no sheet, no call slot), and on a phone still publishes
  `--sk-visible-height` so the game's root follows the on-screen keyboard as it does today
  (Mini Games T416). `withoutChat` unset or `false` is the docked layout as before; the props
  are now a union, so `chat`, `bar` and `callId` stay required unless `withoutChat` is `true`.
- **The dock's visibility signal** (`useDockSight`, with the type `DockSightValue`, from
  `@seasonal/kit/react`): a game's own frame inside the dock reads `visible` (always on a
  desktop, while the sheet is open on a phone) and passes its unread count to `arrivals`, as the
  website's chat frame does. It is `null` outside a dock. `useDockArrivals` and
  `WebsiteChatFrame` now read it too (reused, nothing changes for them).

### Changed

- **Stale lines about the call view** (`callView.ts`, `ChatDock.tsx`, the README): the site
  serves `/embed/call/<id>` now (website e11b3eb); the kit still frames nothing until its link
  is checked against the site's real messages (BACKLOG 8).
- **The showcase** (`showcase/`) has Mini Games' bar as one more state (the back link first, a
  `prefs` button), and `layout.spec.ts` measures it at 1280, 390 and 320 px; its back-link gap
  test reads the words' own `<span>`. Nothing a game uses.
- **The showcase's build** (`showcase/vite.config.ts`): its two pages are the input map of
  `build.rolldownOptions` instead of the deprecated `rollupOptions`, which Vite 8.3.8's types
  flag for lint (Renovate #25). Only the showcase changes; nothing a game uses.

- **Docs only:** Bingo's four kit wishes of 2026-11-23 are recorded (DECISIONS K40–K43,
  BACKLOG 15–18), and docs/ADOPTION.md names each v0.12.0 answer by Mini Games' own record.

### Migration, per game

- **Every game:** nothing to do. Each addition is a prop or an option a game must name.

## [0.11.1] - 2026-11-23

The peers become ranges and Renovate leaves Node and the peers alone (DECISIONS K37, K38).
Nothing changes for players; the owner approved merging and releasing it once green.

### Changed

- **The peer dependencies are caret ranges** (K37): `react` `^19.3.1` and `vite` `^8.3.4`, still
  optional, instead of the exact `19.3.1` and `8.3.4`. Up to v0.11.0 npm refused to install the
  kit next to any other version (`ERESOLVE` with Vite 8.3.5, 2026-11-23). The kit still builds
  and tests with its own exact devDependencies, which tests/renovate.test.ts holds inside the
  ranges. The rule is in docs/DELIVERY.md, "The peer ranges".
- **Renovate** (`renovate.json`, K38): `node` is off for the npm and nvm managers, so
  `engines.node` stays `>=22` and `.nvmrc` stays `22`. A peer is never bumped on a minor, patch
  or pin, and a new major widens its range. The rules are in docs/RELEASING.md, "What Renovate
  leaves alone"; tests/renovate.test.ts fails if one is removed or `engines` and `.nvmrc`
  disagree.
- **The delivery proof** runs twice from this version on, once with pnpm and once with npm, the
  npm one on a later peer patch than the kit's own (docs/RELEASING.md step 7).

### Migration, per game

- **Mini Games, Bingo Royale, Seasonal Party, Seasonal Cases:** nothing to do. A game that pins
  React 19.3.1 and Vite 8.3.4 or later on the same major installs as before; the pin moves to
  `#v0.11.1` with the owner's word.

## [0.11.0] - 2026-11-23

The games' requests (DECISIONS K32), the season feed (K34), 24 px pointer targets (K33) and the
handbook (K35). Nothing changes for players until a game moves to it with the owner's word;
released unattended with the owner's approval (K36).

### Added

- **docs/HANDBOOK.md** (DECISIONS K35): how we build a Seasonal game, one place for every new
  game. It covers how we work, the repository and the kit pin, security, hygiene, tests, docs,
  the kit parts every game uses, and embedding in the website. That last part links the
  website's ADDING-A-GAME.md, GAME-INTEGRATION.md and OPEN-ROUNDS.md instead of copying them.
  Every rule names where it is enforced. The README links it.
- **The open-rounds publisher** (`/server`): `openRoundsPage(rounds, { origin, now?, onDrop? })`
  builds version 1 of the website's open-rounds page from a game's own rounds, with the
  website's checks applied here (docs/OPEN-ROUNDS.md, `openRoundsContract.js` at d4230af):
  - id 1–64, never cut;
  - title 1–80 and kind 0–40, cut to fit, never through an emoji;
  - UTC times (a `Date` written as one) or null;
  - whole counts;
  - an https `joinUrl` on the game's origin;
  - no closed sign-up;
  - at most 20, counted after the check;
  - no unknown field.

  `onDrop` hears each round left out and why, with its id only. `OPEN_ROUNDS_CACHE_CONTROL` is
  the answer's header. It replaces the three games' own builders: Bingo, Mini Games and Cases.

- **Seasonal Cases' requests** (BACKLOG 20, 23, 24, 36 there):
  - `useDockReserve()` (20): the height a screen without a chat keeps free at the bottom for
    the dock. It is the strip's 190 px on a desktop and 150 px in a window under 760 px high
    (`CALL_SLOT`), nothing on a phone (`useDockView`), and it follows the window;
  - `ChatDock`/`DockedScreen` `onUnread` (24): hears each new unread count, so the game's bar
    can show it on its chat button (`badge`);
  - `GameBar` `toggles` (36, `BarToggle`): a setting switched in place, e.g. the sound, before
    the panel buttons. Its words stay the same; `aria-pressed` and the icon (a speaker, crossed
    out when off) show whether it is on;
  - `OriginChatFrame({ origin, room })` (23): the website's chat from the website's dev server
    on this PC, for local development. It shares the checked link and sandbox of
    `WebsiteChatFrame`. Any origin that is not a loopback host (localhost, 127.0.0.1, [::1])
    renders nothing, so no production origin is ever framed this way.
- **`ResultFrame` as a panel inside a screen** (`panel={{ level }}`, Bingo R4): the headline is a
  heading of the game's level (2–6) instead of the page's `h1`, and `data-sk-variant="panel"` gives
  it no one-screen first part. Names break only at their own break points (`overflow-wrap:
normal`) instead of anywhere. A frame without `panel` is the page it was
  (`data-sk-variant="page"`).
- **The season feed reader** (`/server`, DECISIONS K34). `seasonFeedReader({ origin, fetch,
timeoutMs?, staleAfterMs? })` reads the website's `GET /api/public/season` server to server.
  Its `refresh()` never throws and keeps the last good answer when a read fails. `state()` gives
  that answer, when it came, `stale` (none yet, or older than 10 min by default) and `lastError`.
  `parseSeasonFeed` checks version 1 strictly (`v: 1`, `inSeason` with season, token and since,
  `halvingDays`) and keeps only the fields it knows. The kit has no guarded fetch, so the game
  passes its own. The reader adds https only, no redirect followed, a 5 s timeout, 64 KiB at
  most, and JSON.
- **Fit floors for Seasonal Party and Seasonal Cases** (K14): `FitGame` gains `seasonal-party`
  and `cases`, with `[data-sk-game=…]` rules in `fit.css`, each with exactly what the game has
  today: 14 px text, 24 px display values, 22 px rows, 44 px targets, a 14 px badge and the
  scale floor 0.6. tests/fit-floors.test.ts holds them.
- **`MIN_POINTER_TARGET` (24) and `--sk-min-target: 24px`:** WCAG 2.5.8's least pointer target,
  for every target in every game (DECISIONS K33). The 40/44 px phone floors stay. The
  showcase's axe run keeps `target-size` on, and a probe test proves it reports two 10 px
  buttons side by side. Nothing in the kit was below it.

### Changed

- **docs/ADOPTION.md, checked against the games of 2026-11-23:**
  - Mini Games master `21434d8`: the Pre-picks button, per-account settings, open rounds, the
    refit after fonts, comment-free production files, its audit;
  - Bingo's adoption branch `5c613c0`, on v0.10.1 with R1–R4 kept until now;
  - Seasonal Cases `cc75504`, on v0.8.0, its six stand-ins and what replaces them;
  - Seasonal Party `e907de9`, with its new floors.

  Two Mini Games needs the kit does not cover yet are listed for the owner.

- **`RateLimiter` takes a rule or a function that gives it** (`RateRuleSource`, Bingo R3). A
  function is read on every `take`, so a limit a game's admin changes at runtime applies at once.
  A lowered limit caps the buckets now, a raised one refills them toward it, and a new window
  counts for the refill and for forgetting idle keys. A broken rule given later, or a read that
  throws, keeps the last valid rule: the limit never lifts and `take` never throws. A broken
  first rule still fails at construction. A fixed rule works as before.
- **The app header folds whenever its items do not fit on one row** (Bingo R1: "the top bar
  never takes two rows"). Before the paint, `useHeaderFold` (new, inside `MenuFold`) checks
  whether an item starts below another's bottom; if so the header folds into its Menu and says
  so in `data-sk-folded`. It tries one row again on a new close key and in a window grown past
  the width it folded at, and it checks again when the header changes size. There is no fixed
  width any more: before, it folded below 960 px only. Now a website admin's long bar in website
  mode folds at 1280 px, and a short bar stays in one row on a wide tablet. Folding again closes
  nothing. Unfolding closes an open menu, since its items are back in the bar. A render never
  reads the window: the first render is unfolded, and the layout effect decides before the
  paint.

### Fixed

- **The back link's space.** "←" and "Seasonal Entertainment" no longer touch: in the link's
  flex box the space after the arrow collapsed, so `.sk-back-link` keeps a `gap` of 0.35em
  (Bingo R2, Seasonal Party). showcase/layout.spec.ts measures it in the browser.
- **The game bar on narrow phones** (Cases 32). Its facts shrink and end in "…", and its
  buttons wrap to a second row only when they alone do not fit, so a crowded bar no longer runs
  past a 320–375 px screen. The time keeps its width, and every button keeps its 44 px target.
  A phone bar is as high as its buttons; it was capped at 52 px, and is now taller only when the
  buttons wrap. The time has the class `sk-bar-time`. Measured at 320, 360 and 375 px in
  showcase/layout.spec.ts.

### Security

The pass before this version (docs/security-pass.md, 2026-11-23): gitleaks and osv-scanner found
nothing, and a fresh reviewer read the season feed reader and the rate limiter. Each finding is
fixed with a test:

- **The season feed's 64 KiB cap** is counted in bytes as the body streams in. The stream is
  cancelled past the cap; before, a body without a length was read whole first.
- **The reader's own checks:**
  - a refused answer's body is cancelled;
  - a redirected answer is refused;
  - a timer of its own covers the whole read, even when the game's fetch drops the signal;
  - reads that overlap share one request;
  - the options must be whole milliseconds;
  - impossible dates, out-of-order days and more than 64 halving days are no feed.
- **`RateLimiter` keeps a frozen copy of each rule it checked,** never the game's object. A rule
  changed in place can no longer lift the limit. A window must be whole and at least 1 ms;
  before, any finite window over 0 was taken.

### Migration, per game

Players see no change until a game takes these. In a game's code:

- **Every game with `AppHeader`:** the fold is measured, so a short bar may stay in one row on
  a tablet, and a long one folds on a desktop. A game's own CSS for the folded header keys on
  `.sk-header[data-sk-folded='true']` instead of `@media (max-width: 959px)`.
- **Every game with `GameBar`:** on a narrow phone its facts end in "…" and its buttons may
  wrap. A phone bar with wrapped buttons grows past the 52 px it was capped at.
- **Every game with `RateLimiter`:** a rule's window must be whole milliseconds, 1 or more.
  Every game's rules are already whole.
- **Seasonal Bingo Royale:** its kept parts can go:
  - its header (`useBarFold`, `MenuFold`, `menu.css`) for `AppHeader` (R1);
  - its `.shell-back` for `BackLink` (R2);
  - its limiter, passing `liveRule`'s function to the kit's (R3);
  - `FinalPlacement`'s section for `ResultFrame`'s `panel={{ level: 3 }}` (R4);
  - its open-rounds answer for `openRoundsPage`.
- **Seasonal Mini Games:** its open-rounds answer becomes `openRoundsPage`; a season read of its
  own becomes `seasonFeedReader` with its guarded fetch.
- **Seasonal Cases:** its stand-ins go:
  - `fit-cases.css` → `data-sk-game="cases"` and `useFitScale('cases')`;
  - `useDockReserve` → the kit's;
  - `OriginChatFrame` → the kit's;
  - `BarToggle` → `GameBar`'s `toggles`;
  - the lead it hides up to 480 px (`moments.css`) can show again;
  - `onUnread` feeds its chat button's `badge`;
  - its open-rounds answer → `openRoundsPage`.

  It also takes v0.10.x's notes: `data-sk-fit-fixed`, and no `sandboxed` prop.

- **Seasonal Party:** `data-sk-game="seasonal-party"` in place of no game (the same floors).
  The back link keeps its space.

## [0.10.1] - 2026-11-22

The audit's noted items (docs/AUDIT-2026-11-22.md "Noted, not changed"). Nothing a player sees
changes; the data attributes' rename is the one thing a game's code would see, listed below.
Released unattended with the owner's approval (DECISIONS K30).

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
  keyframes (DECISIONS K7, K31). tests/prefix.test.ts now checks attributes too, in the CSS, the
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

[Unreleased]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.27.0...HEAD
[0.27.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.26.0...v0.27.0
[0.26.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.25.0...v0.26.0
[0.25.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.24.0...v0.25.0
[0.24.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.23.0...v0.24.0
[0.23.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.22.0...v0.23.0
[0.22.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.19.1...v0.20.0
[0.19.1]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.10.0...v0.10.1
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
