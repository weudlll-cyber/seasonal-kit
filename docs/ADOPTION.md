# Adoption plans

How each game moves onto the kit. These are plans only: no game repository is changed from here,
and each step is a game PR the owner approves (DECISIONS K1, K15).

**Checked on 2026-11-23** against:

- Mini Games `origin/master` `21434d8`;
- Bingo Royale `origin/master` `c1bab70` and its adoption branch `feat/kit-adoption` `5c613c0`
  (PR #58, not merged);
- Seasonal Cases `proto/cases-v1` `cc75504`;
- Seasonal Party `proto/sumo` `e907de9`.

A path and line count below that this check did not change is as it was at the first plan
(Mini Games `866df03`, Bingo `a43209a`, 2026-11-21).

Where each game stands:

- **Mini Games** uses no kit release yet.
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

## Seasonal Bingo Royale

### Where the adoption branch stands (`feat/kit-adoption` `5c613c0`, PR #58)

- **It pins `#v0.10.1`** in `apps/web` and in `apps/server` (a dev dependency, bundled by
  `build.mjs`).
- **Moved onto the kit:**
  - the CSS (fonts, tokens, shell, motion) and `themeInit`;
  - `ThemeToggle`, `WebsiteChatFrame`, `DevSignIn`;
  - on the server: the website sign-in checks, `mappedRoles`, TOTP, `'hex'` recovery codes
    under `SBR_RECOVERY_KEY`, `SessionEnds`, and the dev tools.
- **Removed:**
  - `websiteIdentity.ts`, `totp.ts`, `sessionEnds.ts`, `ThemeToggle.tsx`, `shell/theme.ts`,
    `theme-init.js`, `fonts.css`;
  - `tokens.css` shrank from 142 to 32 lines.
- **Kept, until v0.11.0 had its requests:**

  | Request | What Bingo keeps                                                                     | In v0.11.0                               |
  | ------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
  | R1      | its header: `AppShell.tsx` 293, `MenuFold.tsx` 90, `useBarFold.ts` 75, `menu.css` 72 | a header that folds when it does not fit |
  | R2      | its `.shell-back` link                                                               | the back link's space                    |
  | R3      | `auth/rateLimit.ts` 114, with `liveRule`                                             | `RateLimiter` with a `RateRuleSource`    |
  | R4      | `FinalPlacement.tsx` 134, `Podium.tsx` 51, `podium.css` 133                          | `ResultFrame`'s `panel`                  |

  Each can now go, in a step that pins v0.11.0.

- **Its open rounds** (`apps/server/src/http/routes/openRounds.ts` on master) can take
  `openRoundsPage`. Its limit setting goes up to 100, and the kit keeps at most 20 whatever it
  is given.

### What each export replaces

| Kit export                                                           | Replaces in Bingo (lines)                                                                                                                                                                                                                                                                                                                                                        | Stays in the game                                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`                                                         | the 49 shared tokens of `packages/ui/src/tokens.css` (142)                                                                                                                                                                                                                                                                                                                       | the ball's two tokens, its arena; **its own `--gutter` and `--panel-padding` after the kit's**: they differ from Mini Games under 356 px                             |
| `fonts.css`, `motion.css`, theme                                     | `packages/ui/src/fonts.css` (26), the shared part of `motion.css` (114), `apps/web/public/theme-init.js` (28), `apps/web/src/shell/theme.ts` (73)                                                                                                                                                                                                                                | `sbr-anim-draw`, the ball keyframes                                                                                                                                  |
| `ThemeToggle`, `BackLink`, `shell.css`                               | `apps/web/src/shell/ThemeToggle.tsx` (52); the `.shell-back` link in `AppShell.tsx` (280) and its rules and `.theme-toggle` in `shell.css` (274)                                                                                                                                                                                                                                 | the bar's layout: `order` on `.sk-back-link` and `.sk-theme-toggle`, the phone's first row                                                                           |
| `websiteLoginHref`, `signInAgain`                                    | `websiteSignInHref` and the resign in `apps/web/src/account/WebsiteSignIn.tsx` (114)                                                                                                                                                                                                                                                                                             | `useSignInToPlay`, `SignInLinks`, `SignInPage`                                                                                                                       |
| `WebsiteChatFrame`, `chatEmbedUrl`                                   | the frame of `apps/web/src/shell/ChatDock.tsx` (166)                                                                                                                                                                                                                                                                                                                             | its side panel and phone drawer, `chat.css` (101), until the docked step; the sandbox, now on (K17)                                                                  |
| `ResultFrame` with `panel={{ level: 3 }}` (v0.11.0)                  | the frame around `components/FinalPlacement.tsx` (134)                                                                                                                                                                                                                                                                                                                           | `Podium.tsx` (51) and `podium.css` (133) as `placings`, its rank rows as `more`                                                                                      |
| `fit.css`                                                            | nothing: Bingo has no screen scale                                                                                                                                                                                                                                                                                                                                               | `data-sk-game="bingo"`: floor 1, 14 px text, 44 px targets                                                                                                           |
| `@seasonal/kit/server`                                               | most of `apps/server/src/auth/websiteIdentity.ts` (125); `safeNext`, `proxySecret` in `http/routes/websiteSignIn.ts` (118); `totp.ts` (73); `hashOf` and the code draw in `twoFactor.ts` (151); `rateLimit.ts` (114 on the branch, its class; `liveRule` passes a function rule since v0.11.0); `sessionEnds.ts` (28); `packages/contracts/src/http/steps.ts` (76) in the server | the route; `steps: 'all'`, logging `badSteps` once; `'hex'` recovery codes and its recovery key (K20); answering `guest` and `invalid` with its login hop; its rules |
| `AppHeader`, `header.css` (v0.9.0, K21)                              | the bar of `AppShell.tsx` (280), `MenuFold.tsx` (86) and its test (72), `menu.css` (72), the bar's rules in `shell.css` (274)                                                                                                                                                                                                                                                    | its emblem, links, routes as `closeKey`; `buttonClassName="sbr-btn"`                                                                                                 |
| `DevSignIn`, `@seasonal/kit/devtools` (v0.9.0)                       | `apps/web/src/shell/DevTools.tsx` (92); the account check of `routes/devSignIn.ts` (78); `devStub.mjs` (24) and the scan of `productionBundle.test.ts` (76)                                                                                                                                                                                                                      | the route and its dev switch, the accounts (host, three players, the `load-NNN` pattern), Quick Test and its simulation                                              |
| `DockedScreen`, `ChatDock`, `StartCard`, `GameBar`, focus mode (K18) | the side panel and phone drawer of `ChatDock.tsx` (166) and `chat.css` (101); the match screen's own bar                                                                                                                                                                                                                                                                         | the board, the balls, the claim; its panels' contents                                                                                                                |

### The docked layout (DECISIONS K18)

The owner decided that Bingo moves to the docked chat strip, the start card and the game bar with
focus mode. The steps, each a game PR:

1. The docked screen around the match: `DockedScreen` with `WebsiteChatFrame` in the strip, the
   side panel and drawer removed.
2. The start card before a match opens: `StartCard` with Bingo's season, pattern and facts.
3. The game bar and focus mode: `GameBar`, `usePanels`, `useFocusMode`, the players and host
   panels.

**The condition:** before the owner tests it, every screen of the match must fit and pass axe
at the sweep sizes, in light and in dark:

- desktop: 1280×720, 1366×768, 1536×768, 1440×900, 1900×860, 1920×1080;
- phone: 375×667, 360×780, 390×844, 430×932.

The check is Bingo's fit audit (`e2e/acceptance/fitAudit.spec.ts`) extended to these sizes. The
board must stay whole without scrolling at every desktop size, and the chat bar must stay
reachable on every phone.

### Order

1. Tokens, fonts, motion, theme.
2. The shell parts: toggle and back link.
3. The chat frame (`WebsiteChatFrame` in its side panel).
4. The server's checks.
5. `ResultFrame` around its final placement.
6. The header and the dev tools (v0.9): `AppHeader` replaces its bar; the server's dev sign-in
   and bundle test take `@seasonal/kit/devtools`.
7. The docked layout, in the three steps above, each after the sweep.

### Risks and the tests to run

- **The token override.** If Bingo's `--gutter` / `--panel-padding` are not loaded after the
  kit's, a 320 px phone gets 16 px margins instead of 14.4 px. Run `minTextSize.test.ts` and the
  fit audit (`e2e/acceptance/fitAudit.spec.ts`).
- **The chat frame now sends `strict-origin`,** as GAME-INTEGRATION §5 requires, and is
  sandboxed (K17): scripts, its own origin, forms and popups are allowed, nothing else (no
  top navigation). Run `chatDock.test.tsx` and `e2e/chatEmbed.spec.ts`, and send, report and
  open a link in the chat by hand once.
- **Recovery codes:** new codes are stored keyed (K20); the stored hex codes still verify. Run
  `twoFactor.integration.test.ts` once with a code stored before the change.
- **The header is the same bar:** the kit's is a port of Bingo's, so its look must not change.
  Compare the e2e screens before and after at 1280 × 720, 959 × 700 and 390 × 844.
- **The login hop's `next`** becomes the page's path, query and hash. It no longer adds `#/` to an
  empty hash; the base path is the same lobby. Run `websiteSignIn.test.tsx` and
  `websiteLogin.integration.test.ts`.
- **The server's stricter role header and user id:** the kit takes only a positive safe integer.
  Bingo's own rule allowed letters, which the website never sends. Run
  `websiteLogin.integration.test.ts`, `websiteRules.integration.test.ts` and
  `twoFactor.integration.test.ts`.

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

## What v0.12.0 answers

Mini Games' items 1, 2, 3, 6 and 7 (its O143, T414, O144/T415 and T416). Each is opt-in: a game
that changes nothing sees today's behaviour.

- **A `prefs` icon** in `GameBar`'s `BarIconName`, for the Pre-picks button.
- **A back link in `GameBar`**: `back={{ websiteMode }}`; a desktop shows arrow and words, a
  phone the arrow alone (K39).
- **`watchFit` / `useFitScale` after web fonts**: the option `afterFonts` (T404).
- **`DockedScreen` without a chat**: the prop `withoutChat`, which still follows the on-screen
  keyboard.
- **The dock's visibility signal**: `useDockSight()` from `@seasonal/kit/react`, for a game's own
  frame inside the dock.

Not in it, recorded in [BACKLOG.md](BACKLOG.md) part one: a middle part in `ResultFrame` (12,
T417), the dock bar's padding and field (13, T416 (3)), a host chat from another https origin
(14, T412, deferred).

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
