# Adoption plans

How each game moves onto the kit. These are plans only: no game repository is changed from here,
and each step is a game PR the owner approves (DECISIONS K1, K15).

**After moving the kit pin** (every game): stop the dev server, delete `node_modules/.vite` and
start it again. A running Vite keeps serving the old pre-bundled kit; a page can stay blank.

**Checked on 2026-11-23** against:

- Mini Games `origin/master` `21434d8`;
- Bingo Royale `origin/master` `c1bab70` and its adoption branch `feat/kit-adoption` `5c613c0`
  (PR #58, not merged);
- Seasonal Cases `proto/cases-v1` `cc75504`;
- Seasonal Party `proto/sumo` `e907de9`.

A path and line count below that this check did not change is as it was at the first plan
(Mini Games `866df03`, Bingo `a43209a`, 2026-11-21).

**Update, 2026-11-25** (each game's `origin/master`): Mini Games `1988346` pins v0.18.0 (PR #53: v0.14's token names, PR #54: the server's
`RateLimiter` and `SessionEnds`, PR #55: v0.18.0's fit option);
Bingo Royale `2380ea7` and Seasonal Cases `073f9ad` pin v0.11.1; Seasonal Party `a09f803` pins
none. The bullets below are the 2026-11-23 state, kept as the plan's history.

**Bingo's section** was brought to its master `d7d841e` on 2026-11-26; it, and not the bullets
below, says where Bingo stands.

Where each game stood on 2026-11-23:

- **Mini Games** used no kit release yet.
- **Bingo's adoption branch** pins v0.10.1 and has moved its tokens, fonts, motion, theme, chat
  frame, dev sign-in and server checks onto the kit. It kept its own header, back link, rate
  limiter and final placement until the kit had its requests R1–R4, all in v0.11.0.
- **Seasonal Cases** pins v0.8.0 and keeps four stand-ins under `packages/ui/src/pending/`,
  which v0.11.0 replaces (its section below). It moves to a newer version on the owner's word
  (DECISIONS K28).

The kit's exports are listed in the [README](../README.md); each version's changes for a game
are in the [CHANGELOG](../CHANGELOG.md) under "Migration, per game".

**What the owner should see change: nothing**, unless a row below says so. Every visible
difference between the games is a per-game option whose default keeps the game as it is. The
choices that would change something are listed in "Needs the owner's word" at the end.

## Seasonal Mini Games

The primary source of most of the kit, so most of it replaces code that came from here.

### What each export replaces

| Kit export                                                                                      | Replaces in Mini Games (lines)                                                                                                                                 | Stays in the game                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`                                                                                    | the 49 shared tokens of `packages/ui/src/tokens.css` (168)                                                                                                     | its own tokens: arena colours, marks, `--font-size-ball`                                                                                          |
| `fonts.css`, `fonts/`                                                                           | `packages/ui/src/fonts.css` (26) and its five woff2 files                                                                                                      | nothing                                                                                                                                           |
| `motion.css`                                                                                    | `smg-anim-win` and the reduced-motion rule in `packages/ui/src/motion.css` (114)                                                                               | its own keyframes                                                                                                                                 |
| `themeInit()` (`/vite`), theme functions                                                        | `apps/web/public/theme-init.js` (28); the logic of `apps/web/src/shell/theme.ts` (93)                                                                          | —                                                                                                                                                 |
| `useTheme`, `useShownTheme`, `ThemeToggle`, `shell.css`                                         | the hooks of `shell/theme.ts`; `apps/web/src/shell/ThemeToggle.tsx` (52) and its `.theme-toggle` rules                                                         | the toggle's place in its bar (`order` on `.sk-theme-toggle`)                                                                                     |
| `BackLink`                                                                                      | nothing yet: the back link is new for Mini Games (GAME-INTEGRATION §8); its bar takes it with `back` (v0.12.0)                                                 | its place at the top left                                                                                                                         |
| `useDisclosure`                                                                                 | `packages/ui/src/useDisclosure.ts` (54)                                                                                                                        | —                                                                                                                                                 |
| `websiteSignInHref`, `signInAgain`, `signInAgainAfter`                                          | `packages/ui/src/websiteSignIn.ts` (67) and its test (52)                                                                                                      | it passes its header: `signInAgainAfter(r, 'x-smg-session-ended')`                                                                                |
| `useFitScale`, `fit.css`                                                                        | `useFitScale`, `settle`, `nextScale`, `FIT_FLOOR` in `apps/web/src/round/useFit.ts` (216) and `fit.test.ts` (87)                                               | `useFit` (the "+N more" count); `useFitScale(…, { afterFonts: true })` for its refit after web fonts (T404, v0.12.0); `data-sk-game="mini-games"` |
| `DockedScreen`, `ChatDock`, `useDockArrivals`, `useDockView`, `dock.css`                        | `match/DockedMatch.tsx` (72), `match/ChatDock.tsx` (179), `match/chatDock.css` (147), the dock rules of `match/docked.css` (243), `round/useRoundView.ts` (40) | the next-round box and the result's own rules in `docked.css`; `#root { height: var(--sk-visible-height, 100dvh) }`                               |
| `WebsiteChatFrame`, `connectChat`, `createChatArrivals`                                         | `HostChat` in `chat/ChatPanel.tsx` (123), `chat/useHostChatFrame.ts` (67), the contexts of `chat/chatArrivals.ts` (52)                                         | its builtin room, reporting through `useDockArrivals`; the sandbox is always on (K17)                                                             |
| `StartCard`, `frames.css`                                                                       | the frame of `round/RoundIntro.tsx` (108) and `round/roundIntro.css` (99)                                                                                      | season names, specials, facts, icons, the halving badge                                                                                           |
| `ResultFrame`                                                                                   | the first part's grid in `round/ResultScreen.tsx` (228) and `round/result.css` (297)                                                                           | headline words, proof, placings table, team line, standings, `ownResult`; `--sk-result-top`                                                       |
| `GameBar`, `usePanels`, `useFullscreen`, `useFocusMode`, `bar.css`                              | `round/FocusBar.tsx` (158), `round/FocusIcons.tsx` (49), `round/usePanels.ts` (55), `round/useFullscreen.ts` (55), the bar rules of `round/focus.css` (212)    | season pill, mode fact, `barTime`, panel ids (now with `prefs`), the panels' grid; the Pre-picks panel itself                                     |
| `PhaseStrip`, `clockText`                                                                       | `games/mind-games/web/PhaseStrip.tsx` (116) and `strip.css` (92); `clockText` in `packages/game-sdk/src/format.ts` (24)                                        | Mind Games' phases, line and announcements                                                                                                        |
| `call.css`, `callSlot` (inside `ChatDock`)                                                      | nothing: the slot is new, hidden without a call id                                                                                                             | —                                                                                                                                                 |
| `@seasonal/kit/server`: `websiteSignInCheck`, `safeNext`, `websiteLoginLocation`, `mappedRoles` | most of `apps/server/src/auth/websiteIdentity.ts` (145); `safeNext`, `proxySecret`, `toLogin` in `apps/server/src/http/routes/websiteSignIn.ts` (123)          | the route, accounts, sessions; `steps: 'each'`; answering `invalid` with 403                                                                      |
| `@seasonal/kit/server`: TOTP, recovery codes                                                    | `apps/server/src/auth/totp.ts` (99); `recoveryCode` and `hashOf` in `twoFactor.ts` (193)                                                                       | every SQL statement of `twoFactor.ts`; style `'grouped'`; its recovery key (K20), from its secrets                                                |
| `AppHeader`, `header.css` (v0.9.0)                                                              | the bar of `apps/web/src/shell/AppShell.tsx` (259): brand, nav, account, "Menu" fold                                                                           | Play, Leaderboard, the boards link, `BuildBadge` in `navExtra`; its routes as `closeKey`                                                          |
| `DevSignIn` (`/react/dev`), `@seasonal/kit/devtools` (v0.9.0)                                   | `apps/web/src/shell/DevTools.tsx` (78); the account check of `routes/devSignIn.ts` (84); `devStub.mjs` (19) and the scan of `productionBundle.test.ts` (96)    | the route and its dev switch, the accounts (host, three players, admin), `QuickTest` as a `navExtra` link                                         |
| `@seasonal/kit/server`: `RateLimiter`, `SessionEnds`                                            | `apps/server/src/auth/rateLimit.ts` (88, its class), `apps/server/src/auth/sessionEnds.ts` (27)                                                                | `RATE_RULES`                                                                                                                                      |
| `openRoundsPage`, `OPEN_ROUNDS_CACHE_CONTROL` (v0.11.0)                                         | `entryOf` and the answer in `apps/server/src/http/routes/openRounds.ts` (66); the zod contract `packages/contracts/src/http/openRounds.ts` (37) for the answer | the route, `listedMatches` in `match/website.ts` (78), `WebsiteSwitch`, the kind "Seasonal Mini Games · <game>"                                   |

### Since the first plan (866df03 → 21434d8)

- **The Pre-picks button** (O117, O122):
  - `FocusBar` has a fourth panel button, Pre-picks (`prefs`), and `FocusShell` (181) has its
    panel;
  - the kit's `BarIconName` has the `prefs` icon since v0.12.0 (O143), so the button is one of
    the bar's `actions`; before it Mini Games would have kept its own bar.
- **Per-account settings** (O116, T399): `match/accountPrefs.ts` (56), migration 0020,
  `match/prefs.ts` (161). Game logic and storage, so they stay in the game; nothing in the kit.
- **Open rounds on the website** (O124–O127): its own route and contract.
  - v0.11.0's `openRoundsPage` takes the checks and the answer (the row above).
  - The game keeps its query and its switch.
  - Its kind keeps within 40 characters by dropping "Seasonal " from the game's name.
- **The refit after web fonts load** (T404): `useFit` fits again on `document.fonts`
  `loadingdone` (a WebKit wrap that ran 32 px over the card). The kit's `watchFit` and
  `useFitScale` do the same since v0.12.0, with the option `afterFonts` (default off).
- **Production files without comments** (O128): `apps/web/productionFiles.ts` (57) strips the
  comments from `index.html` and `theme-init.js`, and `productionBundle.test.ts` (96) checks it.
  The kit's `themeInit()` serves the early script with its header comment. So the game's plugin
  must keep stripping it, or its test fails.
- **The audit of 2026-11-22** (`docs/AUDIT.md`, B1–B7): its fixes are in the game's own rounds,
  frost, seasons and admin pages. The sign-in, TOTP and recovery-code code is unchanged, apart
  from one export no longer made. Nothing in it changes a row here.

### Order

1. **Tokens, fonts, motion, theme** (v0.1–v0.2, the CHANGELOG's oldest notes). These change no
   markup, so they are the safest first step.
2. **Sign-in and the chat link** (v0.3).
3. **The server's sign-in and two-factor checks** (v0.8). This touches no screen.
4. **The shell parts and the disclosure** (v0.4): toggle, back link, `useDisclosure`.
5. **Fit, then the dock** (v0.4–v0.7). Then the start card and the result's frame (v0.5), then
   the bar and focus mode (v0.6).
6. **The header and the dev tools** (v0.9). `AppHeader` with its links, the account and the
   lazily loaded `DevSignIn` and Quick Test link in the `devTools` slot. On the server
   `devSignInAccount` in its route, and `devStubPlugin` and `devMarkersIn` in its bundle build
   and test, with the marker list `KIT_DEV_MARKERS` plus its own.

Each step pins the newest tag; a step never mixes two tags.

### Risks and the tests to run

- **Class names change:** `smg-anim-win` becomes `sk-anim-win`, and `.theme-toggle` becomes
  `.sk-theme-toggle`. Run the game's e2e screens (focus, results, chat, website) in light and dark
  at 1280 × 720 and 390 × 844, and compare them with screenshots from before.
- **The dock's phone height** moves from inline on `#root` to `--sk-visible-height`. Run
  `chatDock.test.tsx`, `dock.test.tsx` and the phone e2e with the on-screen keyboard (T364).
- **Sign-in:** the loop guard's sessionStorage key becomes `sk.signInAgainAt:<route>`, so a guard
  set just before the update is forgotten once. Run `websiteSignIn.integration.test.ts`,
  `websiteSecurity`, `websiteIdle`, and the website e2e.
- **The server's stricter role header:** a comma list is no longer read. The website never sends
  one, but re-run `websiteSignIn.integration.test.ts`. Its fixtures with `'member, Admin'` must
  send `admin` instead.
- **The peer:** `websiteSignInCheck` takes the TCP peer, `req.socket.remoteAddress`. Never pass
  Fastify's `req.ip`: with `trustProxy` it comes from a forwarding header anyone can send. The
  same holds for Bingo.
- **Two-factor:** stored recovery-code hashes keep working with `'grouped'`. New codes are
  stored as HMAC-SHA-256 with the game's recovery key (K20); the lookup asks for both hashes
  (`code_hash = ANY($2)` with `recoveryLookups`). Run `adminTwoFactor.integration.test.ts`, once
  with a code stored before the change.
- **The header:** the chip's "Signed in as" is shown only above 1440 px, as Bingo does. The
  header folds whenever its items do not fit on one row (measured since v0.11.0; before it,
  below 960 px), so a short bar may stay in one row on a tablet. Run the shell's tests and the
  e2e screens at 1280 × 720, 960 × 700 and 390 × 844 in light and dark.
- **The data attributes** are `data-sk-` prefixed since v0.10.1: a fitted part is marked
  `data-sk-fit-fixed`, a test reads `data-sk-fit-scale`.
- **The dev tools:** the production bundle must still have no dev marker. Run
  `productionBundle.test.ts` after `pnpm build`.

### Since v0.15.0

- **Sign-in failures** (K46): its failed sign-ins are braked with `FailureBrake`, the route asking
  `braked(key)` before the password check and calling `failed(key)` on a wrong one; the rules and
  the keys stay in the game.
- **"Closest to winning"** (BACKLOG 12): `ResultFrame`'s `middle` slot takes its `Guesses` card
  between the first part and "more"; a game that passes none sees today's layout.

### Since v0.16.0

- **Fonts on the start card** (K48, T404, T423): pass `fit={{ afterFonts: true }}` to `StartCard`
  and delete the start card's own font-load counting; without the prop the card is as before.

### Since v0.18.0

- **Fonts on the result frame** (K55, T423): pass `fit={{ afterFonts: true }}` to `ResultFrame`
  (with `fitted`) and delete `useFontLoads` from the result frame's signature; without the prop
  the frame is as before.

### Since v0.19.0

- **Step badges in the header** (K56): available and optional. Pass the member's steps as
  `account.steps` to `AppHeader`; without it the header is as before.

### Since v0.20.0

- **Game bar panel buttons** (K58): its bar may pass `controls` (the id of the panel a button opens) so the button carries `aria-controls`; the call frame now sends `strict-origin` as its referrer, as the chat frame does. Optional, no change needed.

### Since v0.21.0

- **Health routes** (K64): `http/routes/health.ts` registers `HEALTH_PATHS` and answers with `readiness(pingDatabase, { extra: feed time })`; names unchanged. Only on the owner's word.
- **Session cookie, CSRF, headers** (K63): `auth/sessionPlugin.ts` takes `sessionCookie` and `sessionCookieOptions` with `Max-Age` from the session's length (the cookie is 30 days today, a website session 7: it outlives it by 23); its CSRF token stays and `writeCheck` is added as a second layer, with its own host behind the website's proxy; `http/plugins/securityHeaders.ts` takes `securityHeaderSet` with its `ancestors` and `admin` rules and drops `'unsafe-inline'` from `style-src` once its inline styles move. Only on the owner's word.
- **Guarded fetch** (K62): `apps/server/src/seasons/safeFetch.ts` (99 lines) and `integration/safePost.ts` (87 lines) are replaced by the kit's `guardedFetch` and `isPublicAddress`; its feed reader gets `guardedFetch({ allowedHosts: [the website's host] })`. Its `readLimited` is also used by the account feed: that stays until the kit's fetch serves it. Only on the owner's word; its own address check misses a literal written `[::ffff:7f00:1]`, which the kit's catches.
- **Backups** (K61): `ops/lib/backup.sh` (153 lines) and its pull scripts are replaced by the kit's `ops/backup.sh`, `pull-backups.sh` and `pull-backups.ps1` with `SK_BACKUP_PREFIX=smg`; its restore drill is the kit's (a throw-away PostgreSQL, each table compared with the dump). Only on the owner's word. The kit's restore refuses the existing backups as they are (they hold `uploads.tar` and no manifest, `ops/lib/backup-restore.sh`): rewrite one before restoring it, as Mini Games' `docs/operator-guide.md` section 5 describes (branch `feat/kit-0.22`, `a483d81`); the old files age out with the retention.

### Since v0.22.0

- **Game bar** (K65): its focus bar's facts wrap on a phone instead of ending in "…" and the bar has padding of its own from the gutter tokens: the look of the bar changes on adoption, so check its round screen at 360 px. Any padding of its own on the bar goes (`round/focus.css`). Only on the owner's word.

### Since v0.23.0

- **Test tools** (K66): `e2e/screens.ts` is replaced by `setTheme`, `captureLook` and the sizes of `@seasonal/kit/testing` (its focus-mode fallback is in the kit's); `noFixedColours.test.ts` and `designTokens.test.ts` become calls of `findFixedColours` and `findLowContrast` with its own pairs. Only on the owner's word.
- **Sweep** (K67): a spec calls `sweep` over its screens with `axeFinder(AxeBuilder)`; it gains the 200 % font and the 320 px sizes it does not run today. `e2e/contrast.ts` stays. Only on the owner's word.

### Since v0.24.0

- **Step badges** (K68): `round/PlayerSteps.tsx` is replaced by `StepBadges` with `steps.css`; a step without an icon is no longer written as text (the header's look, decided). Only on the owner's word.
- **Countdown** (K69): its offset comes from `syncClock`'s three round trips passed to `clockOffset`; `useTicker` for the countdown to the open becomes `useCountdown` or the card's `opensAt` (the cooldown ring keeps `useTicker`). Only on the owner's word.
- **API client** (K70): `shell/http.ts` becomes `createApiClient({ csrf, onAnswer: (r) => signInAgainAfter(r, SESSION_ENDED_HEADER) })`; its `refusal` field is read from `ApiError.body`; `boards/useApi.ts` becomes `useApiGet`. Only on the owner's word.

### Since v0.25.0

- **Backup split and route file** (K71, K72): its copy at `$SMG_ROOT/kit/backup.sh` (`ops/lib/backup.sh` line 21) becomes a copy of the kit's whole `ops/` folder, keeping the layout, since `ops/backup.sh` loads `ops/lib/` from beside itself; `ops/lib/website-route.sh` is replaced by the kit's with its names as `SK_ROUTE_*`, its end-of-install check (`verify_website`) staying. Its route's authorize and metrics rules are the kit's. Only on the owner's word.
- **Load helpers** (K73): `load/measure.mjs`'s `spread` and `metricsSampler` become `latencies` and `watchServer({ prefix: 'smg_' })`; its percentiles move one rank down (nearest rank). Only on the owner's word.

### Since v0.26.0

- **Website stand-in** (K74): the contract half of `e2e/websiteStub.ts` (authorize, identity, login, chat page) becomes `startWebsiteStandIn`; its nginx stack with the game's real route file, the database and the account-changes feed stay. Only on the owner's word.

### Since v0.27.0

- **The fix release** (CHANGELOG, "Migration, per game"): the headers, the named cross-origin write, the local origin, the bar gutter and the CI triggers. Only on the owner’s word.

### Since v0.28.0

- **Icons, operator address** (K83, K85): `seasons.css` and `SeasonIcon` in place of its four optimized season files (its own differ from the website's: the website's drawings show after); its installer calls `sk_operator_email`. Only on the owner's word.
- **Install and guide** (K86): nothing; it follows the rule.

### Since v0.29.0

- **The admin command** (K87): its command moves onto `ops/lib/admin.sh` (CHANGELOG, "Migration, per game"); rehearse update, rollback and uninstall on a test machine. Only on the owner's word.

### Since v0.30.0

- **Host baseline** (K88): the installer calls `sk_host_baseline` with its mode; rehearse on a test server, SSH on its own port included. Only on the owner's word.

### Since v0.31.0

- **Container hardening** (K89): the database service takes the settings of OPERATIONS.md and a test calls `findWeakContainers`; rehearse with a copy of existing data. Only on the owner's word.

### Since v0.32.0

- **Database roles** (K90): CHANGELOG "Migration, per game"; rehearse the conversion with a copy of existing data. Only on the owner's word.

### Since v0.33.0

- **v0.33.0** (CHANGELOG, "Migration, per game"): nothing needed. Check the folded header and, where it shows step badges, the unfolded one once. Only on the owner's word.

### Since v0.34.0

- **Base components** (K95): `packages/ui/src/base.css`’s button, panel, field, input, select, chip and badge rules are replaced by `components.css` and the `sk-` class names; the field lock and the signed field stay. No look change intended. Only on the owner's word.
- **Header looks** (K96): nothing to remove; check the chip, "Sign in" signed out and the phone's back-link row once. Only on the owner's word.
- **Its findings** (K97 to K103; CHANGELOG, "Migration, per game: the fixes"): its own
  `GRANT TEMPORARY`, its admin fetch wrapper, its own contrast test for the own-row tint and its
  stub's secret check go. Only on the owner's word.

### Since v0.35.0

- **The way to production** (K106 to K109; CHANGELOG, "Migration, per project"): the privacy list and its test, the scan call in place of its Trivy step, the signed release and `sk_image_verify`; `browsers.yml` stays, no full browser suite on pull requests. Only on the owner's word.

### Since v0.36.0

- **v0.36.0** (CHANGELOG, "Migration, per game"): its own large-text rules for kit parts go; `Attempt` from `@seasonal/kit/server`; the handbook's "How we check" into its `CLAUDE.md`. Only on the owner's word.

### Since v0.37.0

- **Shared call** (K77, K114): `onSharedCall` on its `DockedScreen` with chat (`match/DockedMatch.tsx`) in website mode, `BackToCall` on the result, `call.css`; no call-id field. CHANGELOG "Migration, per game" has the standalone rule and the one browser check. Only on the owner's word.

### Since v0.38.0

- **The sweep** (K115, K116): its sign-in before each screen becomes the screen's `setup`; its guess list's floor is declared as `floors` (its decisions 50 and O109). Only on the owner's word.

### Since v0.39.0

- **v0.39.0** (CHANGELOG, "Migration, per game"): `onlyNotVisible` and `intendedOverlaps` in place of text exemptions, `useScrollTabStop`, the chat bar's allowance goes. Only on the owner's word.

## Seasonal Bingo Royale

### Where Bingo stands (master `d7d841e`, read 2026-11-26)

- **It pins `#v0.11.1`**: `apps/web` as a dependency, `apps/server` as a dev dependency (bundled
  by `build.mjs`). Its branch `feat/kit-0.22` (`712080c`, not merged) moves further; this section
  describes master.
- **On the kit since v0.10.1:** the CSS of fonts, tokens, shell and motion, `themeInit`,
  `ThemeToggle`, `WebsiteChatFrame`, `DevSignIn`, and on the server the website sign-in checks,
  `mappedRoles`, TOTP, `'hex'` recovery codes under `SBR_RECOVERY_KEY`, `SessionEnds` and the dev
  tools. `packages/ui/src/tokens.css` is 32 lines (the arena's tokens, `--gutter`,
  `--panel-padding`).
- **Moved with v0.11.1** (what the plan below once called R1 to R4):
  - the header: `AppHeader` in `shell/Header.tsx` (124) with its look in `shell/header.css` (167);
    `MenuFold.tsx`, `useBarFold.ts` and `menu.css` are gone;
  - the back link: the kit's `BackLink` inside that header;
  - the limiter: `RateLimiter` with `liveRule`'s function rule; `auth/rateLimit.ts` (60) holds the
    rules;
  - the result frame: `ResultFrame` as a panel (`level: 3`) in `components/FinalPlacement.tsx`
    (174); `Podium.tsx` (59) and `podium.css` (140) are its `placings`.
- **Open rounds:** `http/routes/openRounds.ts` answers with `openRoundsPage`. The admin setting
  "Open sign-ups for the website" is 1 to 20, the website's cap (`MAX_OPEN_ROUNDS`; it was 1 to
  100 until 2026-11-23).
- **Docked layout, step 1, is on master** (website mode): `shell/DockedChat.tsx` (63) holds the
  kit's `DockedScreen` and `WebsiteChatFrame`; `ChatDock.tsx` and `chat.css` are gone; its test is
  `shell/dockedChat.test.tsx`. Steps 2 (start card) and 3 (game bar, focus mode) are not built.

### Still its own on master, and what its next adoption changes

- **The header's order** (K43): `shell/header.css` still puts the theme toggle before the account
  with `order`; the kit's order has it last. Those rules go.
- **The fold below 960 px:** a media query of its own in `shell/header.css`; `foldBelow={960}`
  replaces it (K40, v0.13.0).
- **The result's tightening in the dock:** `shell/dockResults.css:23-45` overrides the kit's panel
  (padding, gap, the heading on the line's row, its size). `dense` (K93) is the kit's own form;
  count the places again before the rules go.
- **Writes without a browser** (K60): `writeCheck` refuses a write that names neither `Origin` nor
  `Sec-Fetch-Site`. Before it goes in, the scripts and tests that write send one of them:
  the e2e specs' request contexts, `load/common.mjs`, `load/asyncJump.mjs`,
  `apps/server/demo-league.mjs` and the server's integration tests.
- **The backup scripts:** the kit's `ops/backup.sh` loads `lib/` beside itself, so the kit's whole
  `ops/` folder is installed as one folder (say `ops/kit/`), not file by file. Bingo's
  `sbr update` installs `lib/*.sh` and `lib/*.sql` only (`ops/lib/config.sh:186`), and the update
  that brings a new version runs the **old** `install_files`. So an older install takes two
  steps. The first version adds `ops/kit/` to `install_files` and to `STACK_FILES` (`save_stack`
  skips a name that does not exist yet) and works without the folder: updating to it still runs
  the old file list, so it brings the new script and list, **not yet the folder**. The second
  update, run by that new script, installs the folder; only that version may need it. An install
  that skips the first step runs the installer again instead.
- **The older updater and `ops/lib/db-roles.sql`** (K90): Bingo's `sbr update` of the versions
  before the kit's admin command (master `d7d841e`: `ops/sbr`, `cmd_update`; `ops/lib/config.sh`,
  `apply_db_roles`) refuses, on an install with database roles, a ref without
  `ops/lib/db-roles.sql` ("older than the database roles"), and then sends the file it has just
  installed to the database. So the path stays, holding comments and no statement, until no such
  install is left; the new version's own check for older refs accepts either path.
  **The owner's `TEMPORARY` grant** (K97) is in the kit's `db-roles.sql`, which only the new
  command runs: after an update driven by the older script it is missing until the new command's
  first roles run (its next update or a restore), so a migration that needs a temporary table
  waits for that. To run it at once, run the installer again, or call `sk_db_roles_apply`
  ([OPERATIONS.md](OPERATIONS.md) "Database roles") with the environment's passwords.

**Tests to run at that step:** `apps/web/src/minTextSize.test.ts`, `shell/dockedChat.test.tsx`,
`e2e/chatEmbed.spec.ts`, the fit audit (`e2e/acceptance/fitAudit.spec.ts`), and the screens at
1280 x 720, 959 x 700 and 390 x 844 before and after.

### The docked layout (DECISIONS K18)

The owner decided that Bingo moves to the docked chat strip, the start card and the game bar with
focus mode. The steps, each a game PR:

1. The docked screen around the match: done (above).
2. The start card before a match opens: `StartCard` with Bingo's season, pattern and facts.
3. The game bar and focus mode: `GameBar`, `usePanels`, `useFocusMode`, the players and host
   panels.

**The condition:** before the owner tests it, every screen of the match must fit and pass axe
at the sweep sizes, in light and in dark:

- desktop: 1280×720, 1366×768, 1536×768, 1440×900, 1900×860, 1920×1080;
- phone: 375×667, 360×780, 390×844, 430×932.

The check is Bingo's fit audit extended to these sizes. The board must stay whole without
scrolling at every desktop size, and the chat bar must stay reachable on every phone.

### Since v0.15.0

- **Login limits** (K46): at its next kit adoption its login limits move onto `FailureBrake`: the
  route asks `braked(key)` before the password check and calls `failed(key)` on a wrong one. Its
  rules and keys stay in the game; the kit's `RateLimiter` keeps the limits that count every call.
- **The result** (K47; since v0.33.0 K93 adds `dense`): Bingo shows its result like the
  other games, the first part and "more" as the kit lays them out, and at its next kit adoption
  drops its own `results.css` overrides of the kit's result classes (`display: contents` on the
  first part, head, places and "more", `display: none` on the reveal). With no reveal the frame
  renders none and lays the first part out in one column itself (v0.15.0).

### Since v0.19.0

- **Step badges in the header** (K56): available and optional. Pass the member's steps as
  `account.steps` to `AppHeader`; without it the header is as before.

### Since v0.20.0

- **Nothing to do** (K58). Bingo has no game bar and no call slot; the package's `sideEffects` field lets its bundler drop unused kit JavaScript.

### Since v0.21.0

- **Health routes** (K64): `routes/health.ts` answers with `readiness`; its `openRouteLimit` and names stay. Only on the owner's word.
- **Session cookie, CSRF, headers** (K63): `cookieConfig`, `setSessionCookie` and `clearSessionCookie` become `sessionCookie` and `sessionCookieOptions` (the same names and lifetime); `writeCheck` is added next to its token; `securityHeaders.ts` becomes `securityHeaderSet({ mode, devPage as inlineStyles, blobImages: true })`. Only on the owner's word.
- **Guarded fetch** (K62): Bingo has no guarded fetch of its own today (`git grep` for an address block list or `redirect: 'error'` over `origin/master` finds none in `apps/`). Where it later calls an address it was handed (a webhook, a feed), it takes the kit's `guardedFetch`, with `allowLocal` only in development and tests. Only on the owner's word.
- **Backups** (K61): `ops/lib/backup.sh` (248 lines) is the kit's script's source: it moves to the kit's `ops/backup.sh` (its `ops/` folder installed whole, as above) with `SK_BACKUP_PREFIX=sbr`, its seed and recovery keys as `SK_BACKUP_SECRET_FILES`, its schema as `SK_BACKUP_DB_SCHEMA=sbr`. What stays in Bingo: the compose calls, `apply_db_roles` after a restore, and the seed-key check of its drill (run after the kit's drill, or in `SK_BACKUP_START_CMD`). Only on the owner's word.

### Since v0.22.0

- **Header and start card** (K65): the folded brand keeps its longest word and the back link's words wrap on a phone; `StartCard` takes `opensIn` as before. Nothing to change; Bingo has no game bar. Only on the owner's word.

### Since v0.23.0

- **Test tools** (K66): `e2e/screens.ts` is replaced by the kit's; `noFixedColours.test.ts`, `minTextSize.test.ts` (its card-number and podium rules stay) and `designTokens.test.ts` call the kit's guards with its own folders and pairs. Only on the owner's word.
- **Sweep** (K67): the size and font loop pasted into its admin, host and start-match specs becomes `sweep`; `fitProbe`'s text floor, card cells and overlap check stay. Only on the owner's word.

### Since v0.24.0

- **Step badges** (K68): `components/StepBadges.tsx`'s own markup is replaced by the kit's `StepBadges`; its `StepsByName` context stays and passes the steps in. Its visually hidden "Holder: …" words give way to the step's name as the image's name. Only on the owner's word.
- **Countdown** (K69): `useSecondsUntil` (which counts on the page's clock) becomes `useCountdown`, with the offset from a server time in an answer it already gets, or a `time.sync` intent. This fixes a wrong countdown on a wrong clock. Only on the owner's word.
- **API client** (K70): `shell/http.ts` becomes `createApiClient` with its CSRF token and `onAnswer` reporting a lost session (401 or `CSRF_INVALID`); `league/useApiGet.ts` becomes `useApiGet` (the failed state carries the whole error). A network failure is now `ApiError(0, 'NO_ANSWER')`. Only on the owner's word.

### Since v0.25.0

- **Backup split and route file** (K71, K72): its `write_nginx_route` / `write_caddy_route` and `apply_route_file` become `sk_route_install` with `SK_ROUTE_SECRET_HEADER=X-Sbr-Proxy-Secret`; its final checks stay. Only on the owner's word.
- **Load helpers** (K73): `load/common.mjs`'s percentiles, `inBatches` and `watchServer` become the kit's with `prefix: 'sbr_'`; the CPU is reported in cores, not percent. Only on the owner's word.

### Since v0.26.0

- **Website stand-in** (K74): the stand-in proxy of `e2e/websiteStack.ts` becomes `startWebsiteStandIn` (its `stub_user` cookie becomes `se.sid` from `sessionCookie`); the database per worker and `expireSessions` stay. Only on the owner's word.

### Since v0.27.0

- **The fix release** (CHANGELOG, "Migration, per game"): only the headers’ two new directives, if it takes `securityHeaderSet`.

### Since v0.28.0

- **Icons, operator address** (K83, K85): `seasons.css` and `SeasonIcon` in place of its copies of the four optimized season files, which equal the website's; its installer calls `sk_operator_email`. Only on the owner's word.
- **Install and guide** (K86): nothing beyond checking that `docs/operator-guide.md` has the update and uninstall sections.

### Since v0.29.0

- **The admin command** (K87): its command moves onto `ops/lib/admin.sh` (CHANGELOG, "Migration, per game"); rehearse update, rollback and uninstall on a test machine. Only on the owner's word.

### Since v0.30.0

- **Host baseline** (K88): the installer calls `sk_host_baseline` with its mode; rehearse on a test server, SSH on its own port included. Only on the owner's word.

### Since v0.31.0

- **Container hardening** (K89): the database service takes the settings of OPERATIONS.md and a test calls `findWeakContainers`; rehearse with a copy of existing data. Only on the owner's word.

### Since v0.32.0

- **Database roles** (K90): CHANGELOG "Migration, per game"; rehearse the conversion with a copy of existing data. Only on the owner's word.

### Since v0.33.0

- **Failure brake** (K92): `auth/loginBrake.ts`'s `LoginBrake` goes: `FailureBrake` takes `liveRule(...)` as its rule, and `behindBrakes` takes `reserve(key)` for each key, ending each attempt with `failed()` or `passed()` (a refused key ends the ones already taken with `passed()`).
- **Result** (K93): `dense` on the final placement; measure the places again at the six sizes.
- **Header** (K94): its `.sk-header .sk-theme-toggle` and `.sk-menu-button` rules are descendant selectors and keep working; compare the folded bar and the bar at 1280 x 720.
- **Restore** (K91): its seed-key check before the kit's functions may stay; the kit's own restore now refuses first too. Only on the owner's word.

### Since v0.34.0

- **Base components** (K95): `packages/ui/src/base.css`’s button, panel, field, input, select, chip and badge rules are replaced by `components.css`. Visible changes: a disabled button is muted on the second surface instead of faded, a disabled field looks locked. Only on the owner's word.
- **Header looks** (K96): `shell/header.css` drops its chip rules, its solid "Sign in" rule and its phone `.sk-back-link { min-height: 0 }`; compare the phone header at 375 x 667 in website mode. Only on the owner's word.

### Since v0.35.0

- **The way to production** (K106 to K109; CHANGELOG, "Migration, per project"): its privacy list on the template's columns with the test, the scan and release calls in place of its own steps, `sk_image_verify` in the installer, a nightly browser workflow. Only on the owner's word.

### Since v0.36.0

- **v0.36.0** (CHANGELOG, "Migration, per game"): `game_backup_secrets`, `.sk-dense-list`, the sweep's and the stand-in's new options; the handbook's "How we check" into its `CLAUDE.md`. Only on the owner's word.

### Since v0.37.0

- **Shared call** (K77, K114): `onSharedCall` on its `DockedScreen` (`shell/DockedChat.tsx`) in website mode, `BackToCall` on the result, `call.css`. CHANGELOG "Migration, per game" has the standalone rule and the one browser check. Only on the owner's word.

### Since v0.38.0

- **The sweep** (K116): the docked result's 7 places are declared as a floor (its decision of 2026-11-24). Only on the owner's word.

### Since v0.39.0

- **v0.39.0** (CHANGELOG, "Migration, per game"): `restore` needs `--force-env` where keys differ; `sk_cosign_install` and `SK_IMAGE_COMMIT` in the installer; dense buttons in `.sk-dense-list`. Only on the owner's word.

## Seasonal Cases (`seasonal-cases`, branch `proto/cases-v1`)

Cases uses the kit since its start (pinned `#v0.8.0`, `cc75504`):

- the CSS of fonts, tokens, motion, fit, shell, frames, bar, dock and call;
- `DockedScreen`, `useDockView`, `GameBar` and its hooks, `StartCard`, `ResultFrame`,
  `useFitScale`, `BackLink`, `ThemeToggle`, `WebsiteChatFrame`;
- on the server: `RateLimiter`, `SessionEnds`, TOTP and `'grouped'` recovery codes, and the
  website sign-in checks.

Each piece the kit lacked is a stand-in under `packages/ui/src/pending/`, named after its
BACKLOG row there. v0.11.0 has all of them:

| Stand-in (lines), BACKLOG row                         | Kit, since v0.11.0                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `fit-cases.css` (17), 19; `useFitScale('mini-games')` | `data-sk-game="cases"` and `useFitScale('cases')`: 14/24/22/44, 0.6 |
| `useDockReserve.ts` (33), 20                          | `useDockReserve()`                                                  |
| `OriginChatFrame.tsx` (53), 23                        | `OriginChatFrame` (loopback origins only)                           |
| the bar's chat button without its count, 24           | `DockedScreen`'s `onUnread` into the chat action's `badge`          |
| the lead hidden up to 480 px (`moments.css`), 32      | the bar's facts shrink and its buttons wrap                         |
| `BarToggle.tsx` (54), 36                              | `GameBar`'s `toggles` (`icon: 'sound'`)                             |

Its open rounds (`apps/server/src/openRoundsRoutes.ts`, 54) can take `openRoundsPage`, which
also checks what its own schema does not: ISO times, an https `joinUrl` on its origin.

**Risks for its step:**

- **The data attributes** are `data-sk-` since v0.10.1. Its board marks `data-fit-fixed`, which
  becomes `data-sk-fit-fixed`.
- **`WebsiteChatFrame`'s `sandboxed` prop** is gone since v0.10.0: the frame is always sandboxed
  (K17).
- **Tests to run:** its e2e screens and its fit tests at 320–375 px. The bar's lead may show
  again where it now fits.

### Since v0.15.0

- **`FailureBrake`** (K46, its BACKLOG 49): `apps/server/src/auth/failureBrake.ts` replaces its own
  `FailureBrake` class with the kit's from `@seasonal/kit/server`; its `SignInBrake` (D55: 20
  failures per account and address, 100 per account, 20 per address, 15 minutes) and its keys
  stay in the game. One difference: when the map is full of active keys the kit refuses a new
  key (`braked` answers true) instead of evicting the oldest key, so a flood of new keys cannot
  lift an old key's brake.

### Since v0.19.0

- **Step badges in the header** (K56, decided 2026-11-24: no game-side stand-in): pass the
  member's steps to `AppHeader` as `account.steps`, in the kit's `Step` shape (`ladder`, `name`,
  `icon`; the shape `identityFrom` gives from the website's header, so a game that has the
  identity passes its steps as they are). Each is drawn as a small icon beside the name in the
  chip and in the folded menu; an icon address other than "/media/step-icons/<32 hex>.webp" is
  not drawn. Leave the field out and the header is as before.

### Since v0.20.0

- **Game bar panel buttons** (K58): its bar may pass `controls` on a `BarAction` for `aria-controls`; optional. The call frame's referrer policy and the `sideEffects` field need nothing from the game.

### Since v0.21.0

- **Health routes** (K64): `/api/health` and `/api/ready` become `/healthz` and `/readyz` with `readiness`; its installer's probe moves with them. Only on the owner's word.
- **Session cookie, CSRF, headers** (K63, K60): `sameSiteWrites` and `sameOrigin` (`app.ts` 110-136) are replaced by `writeCheck({ trustedProxies })` (it also refuses a write with neither header, which Cases lets pass); its `helmetOptions` (`web.ts`) by `securityHeaderSet({ mode: 'website', frames: [the chat origin] })` in `securityHeadersHook`. Only on the owner's word.
- **Guarded fetch** (K62): done on the way. Cases reads the website's season feed through `guardedFetch` with only the website's host allowed (`apps/server/src/seasonSource.ts`, commit `e54ec31` on branch `kit/v0.17-adoption`; its `master` `073f9ad` has no outward fetch yet).
- **Backups** (K61): **Cases has no backup today** (no `backup`, `restore` or `pg_dump` outside its docs and route files, `git grep` over `073f9ad`), and holds accounts and results. **It moves to Docker first, then takes the kit's backup unchanged** (K76): the database container as `SK_BACKUP_DB_CONTAINER`, the systemd timer from `print-units`, no volumes unless it keeps uploads. The backup comes before its other shared parts. Only on the owner's word.

### Since v0.22.0

- **Four patches deleted** (K65): `shell.css` 195 (the brand rule: the kit's own now, with `flex-basis` 0 instead of auto, so the toggle keeps the Menu's row at 360 and 375 px) and 204 (the chip wrap: the kit has had it since v0.19.1), `moments.css` 27-56 (the bar's padding, the narrow-phone padding and the wrapped facts) and `screens.css` 41 (hides the start card's countdown: leave `opensIn` out instead). The bar looks as its stand-in did, with the buttons on a row of their own when the fact and the buttons do not share one. Only on the owner's word.

### Since v0.23.0

- **Test tools** (K66): it gains the guards it lacks (`findFixedColours`, `findSmallText`, `findLowContrast` over its client) and uses `setTheme` in `e2e/screens.spec.ts`. Only on the owner's word.
- **Sweep** (K67): its `e2e/screens.spec.ts` measurements move onto `sweep`, which adds axe and the 200 % run. Only on the owner's word.

### Since v0.24.0

- **Step badges** (K68): `stage/Badges.tsx` takes `StepBadges` once its contract sends the full step (`{ ladder, name, icon }`, as the website's header does) in place of `badges: string[]`; until then it stays. Only on the owner's word.
- **Countdown** (K69): none today; a show with a start time passes `opensAt` to `StartCard` with the offset from an answer that carries the server's time. Only on the owner's word.
- **API client** (K70): `lib/api.ts` (`getJson`, `postJson`) becomes `createApiClient({ prefix: 'api' })`. Cases' server answers `{ error: sentence }`; its screens read `ApiError.body.error` for the sentence, and `ApiError.code` is `ERROR` until its server sends `code`. `useAction` stays. Only on the owner's word.

### Since v0.25.0

- **Backup split and route file** (K71, K72): its Docker installer (branch `kit/v0.17-adoption`) copies `ops/backup.sh` alone out of the image (`deploy/lib/backup.sh`); it copies the kit's whole `ops/` folder instead, keeping the layout, or the script fails. Its `deploy/` installer may call `sk_route_install` for its route file, with `SK_ROUTE_SECRET_HEADER` its own; compare the written file with its current one before switching. Only on the owner's word.
- **Load helpers** (K73): none today; its first load check starts from `latencies` and `watchServer`. Only on the owner's word.

### Since v0.26.0

- **Website stand-in** (K74): `e2e/websiteStub.ts`'s contract half becomes `startWebsiteStandIn`; its Vite middleware serves the client as the stand-in's app. Only on the owner's word.

### Since v0.27.0

- **The fix release** (CHANGELOG, "Migration, per game"): its header, Menu and docked-screen findings are fixed in the kit; the backup path, the local origin and the CI triggers. Only on the owner’s word.

### Since v0.28.0

- **Icons, operator address** (K83, K85): season icons from the kit if it shows any; its Docker installer calls `sk_operator_email`. Only on the owner's word.
- **Install and guide** (K86): `deploy/install.sh` moves to `ops/install.sh`; `docs/INSTALL.md` and `docs/OPERATIONS-CASES.md` (branch `kit/v0.17-adoption`) are joined into `docs/operator-guide.md`, keeping their content, at its next adoption.

### Since v0.29.0

- **The admin command** (K87): its command moves onto `ops/lib/admin.sh` (CHANGELOG, "Migration, per game"); rehearse update, rollback and uninstall on a test machine. Only on the owner's word.

### Since v0.30.0

- **Host baseline** (K88): the installer calls `sk_host_baseline` with its mode; rehearse on a test server, SSH on its own port included. Only on the owner's word.

### Since v0.31.0

- **Container hardening** (K89): the database service takes the settings of OPERATIONS.md and a test calls `findWeakContainers`; rehearse with a copy of existing data. Only on the owner's word.

### Since v0.32.0

- **Database roles** (K90): CHANGELOG "Migration, per game"; rehearse the conversion with a copy of existing data. Only on the owner's word.

### Since v0.33.0

- **v0.33.0** (CHANGELOG, "Migration, per game"): nothing breaks. Its sign-in should take `FailureBrake.reserve` (K92), or parallel guesses keep passing `braked`. Its header may now give up badges instead of folding at 1536 px. Only on the owner's word.

### Since v0.34.0

- **Base components** (K95): `shell.css`’s `.button`, `.card` and bare input rules give way to `sk-btn`, `sk-panel`, `sk-input` and `sk-select`. Visible changes: bolder, larger button text, a danger button, the locked look of disabled controls. Only on the owner's word.
- **Header looks** (K96): its `ShellBar` wraps the kit's `AppHeader`, so the three looks apply with the pin: the account chip filled with small bold text, "Sign in" solid when signed out, a lower back-link row on phones. Only on the owner's word.

### Since v0.35.0

- **The way to production** (K106 to K109; CHANGELOG, "Migration, per project"): the privacy list and its test, the scan call in place of its Trivy step, one signed image per mode and `sk_image_verify`. Only on the owner's word.

### Since v0.36.0

- **v0.36.0** (CHANGELOG, "Migration, per game"): its allowances for BACKLOG 77 and 78 go; the handbook's "How we check" into its `CLAUDE.md`. Only on the owner's word.

### Since v0.37.0

- **Shared call** (K77, K114): `onSharedCall` on its `DockedScreen` with chat (`App.tsx`) in website mode, `BackToCall` on the result. CHANGELOG "Migration, per game" has the standalone rule and the one browser check. Only on the owner's word.

### Since v0.38.0

- **The sweep** (K115, K116): any floor its owner decided is declared; with none, nothing. Only on the owner's word.

### Since v0.39.0

- **v0.39.0** (CHANGELOG, "Migration, per game"): its allowance for axe `region` goes. Only on the owner's word.

## Seasonal Party (`seasonal-spirits`, branch `proto/sumo`)

A canvas game in plain TypeScript, without React. Its client styles are one `<style>` of 586
lines in `apps/client/index.html`, in Fredoka (`@fontsource/fredoka`) and colours of its own.
DECISIONS K4: the island look and the round font stay inside the play field; the frame around it
comes from the kit.

### What each export replaces

| Kit export                                          | Replaces in Seasonal Party (lines)                                                                                                                 | Stays in the game                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `tokens.css`, `fonts.css`                           | the frame's own hex colours and Fredoka in `apps/client/index.html` (655): the band, the HUD's buttons and banners, the help card, the result list | Fredoka and the Sky Island palette inside the canvas (`render`) |
| theme functions, `themeInit()`                      | its Light/Dark switch's logic (in `start.ts` (36) and the render palette), so one stored choice holds on the website and in every game             | the sky's sun or moon, drawn from the shown theme               |
| `BackLink`'s markup and `shell.css`                 | nothing yet: the back link is new (GAME-INTEGRATION §8)                                                                                            | —                                                               |
| `chatEmbedUrl`, `connectChat`, `createChatArrivals` | nothing yet: the website's room `party` would come first                                                                                           | where the chat sits on its screen                               |
| `callSlot`, `call.css`                              | nothing: new, hidden without a call id                                                                                                             | —                                                               |
| `header.css`'s markup                               | nothing yet: Seasonal Party has no accounts (`8bb648e`)                                                                                            | —                                                               |

**The header, once it has accounts.** The shared header (K21) comes when Seasonal Party gets
sign-in. Without React it writes `AppHeader`'s markup by hand with the same classes
(`sk-header`, `sk-header-brand`, `sk-header-nav`, `sk-header-account`, `sk-menu`) and the fold's
`data-sk-open` (`data-open` before v0.10.1), and opens and closes the fold itself with the same
rules (focus in, Escape, a press outside). The dev tools
come with its server's dev sign-in.

**On `proto/sumo` (`e907de9`)** it already uses the kit's `ResultFrame`, `GameBar` with
`BackLink` and `ThemeToggle`, and `useFitScale`. Its result frame names no game, so the
strictest floors apply. v0.11.0 adds `data-sk-game="seasonal-party"` with exactly that: 14 px
text and the 0.6 scale (K14). The back link's lost space, which it reported to the kit (its
D8), is fixed in v0.11.0.

The React parts do not apply as they are. `dock.css`, `frames.css`, `bar.css` and `fit.css` can
style its own DOM with the same classes. Fitting its screens would need `watchFit`, which is in
the kit's core but not exported yet, since no game uses it: it gets exported in the PR that
adopts it.

### Order

1. Tokens and fonts for the frame.
2. The theme logic.
3. The back link.
4. The chat and call slot, once the website has its room.

### Risks and the tests to run

- **Fredoka must stay inside the play field.** Run `apps/client/e2e/readability.e2e.ts` and
  `help.e2e.ts` in light and dark, at a phone width and a desktop width.
- **Colours on the canvas's edge:** the band and banners take the website's season colours
  instead of its own (`#ffc23c`, `#4cc2ff`, …). This is a visible change that K4 asks for, so the
  owner sees it at the first step.
- **No React:** the plan uses only the framework-free entry and the CSS.

### Since v0.15.0

- **Sign-in failures** (K46): its failed sign-ins are braked with `FailureBrake` when it adopts
  the server entry; the rules and keys stay in the game.

### Since v0.33.0

- **v0.33.0:** nothing to do.

### Since v0.37.0

- **Shared call** (K77, K114): nothing until it embeds in the website with a docked chat; then `onSharedCall` as the CHANGELOG says. Only on the owner's word.

### Since v0.38.0

- **v0.38.0**: nothing beyond the pin. Only on the owner's word.

### Since v0.39.0

- **v0.39.0**: nothing beyond the pin. Only on the owner's word.

## What `.sk-dense-list` needs (every game)

The class does nothing on its own: load `@seasonal/kit/components.css` (after `tokens.css`,
`shell.css` and `fit.css`). Without it a game gets no error, only links as small as its own styles
make them; the probe's finding then says that the stylesheet is missing. The 24 px come from
`fit.css`'s `--sk-min-target`, with 24 px itself where that is not loaded (since v0.39.0). A
button in the list keeps its own size: make it 24 px high or more.

## A game's required checks (every game)

Branch protection requires the jobs a pull request runs (the unit tests, the static and security
checks, the changed browser specs), under the names its `ci.yml` gives them now; the nightly browser
suite (`browsers.yml`) is never required, because a pull request does not run it and would wait for
it for ever.

## Blocking scans (every game)

The kit's `scan.yml` has the input `blocking`; `blocking: true` turns blocking on, and the run then
fails on a finding or a scan that could not run. Off, the default, it reports. Before a game turns it
on: it also fails on ZAP's warnings today (BACKLOG 72).

## A game that lists frame paths one by one

A policy that names the website's frames path by path (`frame-src …/embed/chat …/embed/call/<id>`)
must name `<site>/embed/call/shared` as well, or the browser blocks the shared call's view;
`frame-src 'self'` on the website's own origin allows it without a change.

## What v0.12.0 answers

Five answers, each named by Mini Games' own record. Each is opt-in: a game that changes nothing
sees today's behaviour.

- **A `prefs` icon** in `GameBar`'s `BarIconName`, for the Pre-picks button (O143, T418).
- **A back link in `GameBar`**: `back={{ websiteMode }}`; a desktop shows arrow and words, a
  phone the arrow alone (T414, K39).
- **`watchFit` / `useFitScale` after web fonts**: the option `afterFonts` (O144, T415; the
  refit of T404).
- **`DockedScreen` without a chat**: the prop `withoutChat`, which still follows the on-screen
  keyboard (T416 (1)).
- **The dock's visibility signal**: `useDockSight()` from `@seasonal/kit/react`, for a game's own
  frame inside the dock (T416 (2)).

Not in it, recorded in [BACKLOG.md](BACKLOG.md) part one: a middle part in `ResultFrame` (12,
T417), the dock bar's padding and field (13, T416 (3)), a host chat from another https origin
(14, T412, deferred).

## What v0.13.0 answers

Opt-in again; each names the game that asked.

- **Bingo Royale** (K40, K41): `AppHeader`'s `foldBelow={960}` replaces its always-fold media
  query, and `--sk-floor-text` has a default in `tokens.css` for a game that loads no `fit.css`.
- **Seasonal Cases** (its items 41 and 43): `GameBar`'s `presses` for "Applaud", and
  `useOpenDockChat()` for the bar's Chat button; its `pending/BarPress.tsx` and
  `pending/useChatHandOver.ts` go.
- **Every game with a call** (BACKLOG 8, K44): the dock's slot frames the website's call view when
  the game passes a call id.

## Needs the owner's word

Decided on 2026-11-21: the sandbox in every game (K17), Bingo's docked layout (K18), `showcase`
as a required check (K19). Decided on 2026-11-22: the audit's keyboard, focus and API fixes are
in v0.10.0, before any game adopts the kit (K29); every game takes them with the header.

- **Seasonal Party**, the frame's colours turning into the website's at its first step (asked by
  K4, but visible).
- **Every game**, the recovery key: each game's operator creates one (32 random bytes or more)
  and keeps it with the server's other secrets before the step that adopts v0.9.0's recovery
  codes.
  Decided on 2026-11-22: legacy SHA-256 recovery codes stay valid with no end date, and no game
  sets a deadline for them (K27). A member's legacy codes keep working until each is used.
