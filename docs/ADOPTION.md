# Adoption plans

How each game moves onto the kit. These are plans only: no game repository is changed from here,
and each step is a game PR the owner approves (DECISIONS K1, K15). The paths and line counts are
the games' `origin/master` on 2026-11-21: Mini Games `866df03`, Bingo Royale `a43209a`, and
Seasonal Party `5976ef2` (branch `proto/sumo`).

The kit's exports are listed in the [README](../README.md); each version's changes for a game
are in the [CHANGELOG](../CHANGELOG.md) under "Migration, per game".

**What the owner should see change: nothing**, unless a row below says so. Every visible
difference between the games is a per-game option whose default keeps the game as it is. The
choices that would change something are listed in "Needs the owner's word" at the end.

## Seasonal Mini Games

The primary source of most of the kit, so most of it replaces code that came from here.

### What each export replaces

| Kit export                                                                                      | Replaces in Mini Games (lines)                                                                                                                                 | Stays in the game                                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`                                                                                    | the 49 shared tokens of `packages/ui/src/tokens.css` (168)                                                                                                     | its own tokens: arena colours, marks, `--font-size-ball`                                                            |
| `fonts.css`, `fonts/`                                                                           | `packages/ui/src/fonts.css` (26) and its five woff2 files                                                                                                      | nothing                                                                                                             |
| `motion.css`                                                                                    | `smg-anim-win` and the reduced-motion rule in `packages/ui/src/motion.css` (114)                                                                               | its own keyframes                                                                                                   |
| `themeInit()` (`/vite`), theme functions                                                        | `apps/web/public/theme-init.js` (28); the logic of `apps/web/src/shell/theme.ts` (93)                                                                          | —                                                                                                                   |
| `useTheme`, `useShownTheme`, `ThemeToggle`, `shell.css`                                         | the hooks of `shell/theme.ts`; `apps/web/src/shell/ThemeToggle.tsx` (52) and its `.theme-toggle` rules                                                         | the toggle's place in its bar (`order` on `.sk-theme-toggle`)                                                       |
| `BackLink`                                                                                      | nothing yet: the back link is new for Mini Games (GAME-INTEGRATION §8)                                                                                         | its place at the top left                                                                                           |
| `useDisclosure`                                                                                 | `packages/ui/src/useDisclosure.ts` (54)                                                                                                                        | —                                                                                                                   |
| `websiteSignInHref`, `signInAgain`, `signInAgainAfter`                                          | `packages/ui/src/websiteSignIn.ts` (67) and its test (52)                                                                                                      | it passes its header: `signInAgainAfter(r, 'x-smg-session-ended')`                                                  |
| `useFitScale`, `fit.css`                                                                        | `useFitScale`, `settle`, `nextScale`, `FIT_FLOOR` in `apps/web/src/round/useFit.ts` (206) and `fit.test.ts` (87)                                               | `useFit` (the "+N more" count); `data-sk-game="mini-games"`; its floors written as `var(--sk-floor-…)`              |
| `DockedScreen`, `ChatDock`, `useDockArrivals`, `useDockView`, `dock.css`                        | `match/DockedMatch.tsx` (72), `match/ChatDock.tsx` (179), `match/chatDock.css` (147), the dock rules of `match/docked.css` (243), `round/useRoundView.ts` (40) | the next-round box and the result's own rules in `docked.css`; `#root { height: var(--sk-visible-height, 100dvh) }` |
| `WebsiteChatFrame`, `connectChat`, `createChatArrivals`                                         | `HostChat` in `chat/ChatPanel.tsx` (123), `chat/useHostChatFrame.ts` (67), the contexts of `chat/chatArrivals.ts` (52)                                         | its builtin room, reporting through `useDockArrivals`; `sandboxed` true                                             |
| `StartCard`, `frames.css`                                                                       | the frame of `round/RoundIntro.tsx` (108) and `round/roundIntro.css` (99)                                                                                      | season names, specials, facts, icons, the halving badge                                                             |
| `ResultFrame`                                                                                   | the first part's grid in `round/ResultScreen.tsx` (228) and `round/result.css` (297)                                                                           | headline words, proof, placings table, team line, standings, `ownResult`; `--sk-result-top`                         |
| `GameBar`, `usePanels`, `useFullscreen`, `useFocusMode`, `bar.css`                              | `round/FocusBar.tsx` (138), `round/FocusIcons.tsx` (47), `round/usePanels.ts` (55), `round/useFullscreen.ts` (55), the bar rules of `round/focus.css` (212)    | season pill, mode fact, `barTime`, panel ids, the panels' grid; `buttonClassName="smg-btn"`                         |
| `PhaseStrip`, `clockText`                                                                       | `games/mind-games/web/PhaseStrip.tsx` (116) and `strip.css` (92); `clockText` in `packages/game-sdk/src/format.ts` (24)                                        | Mind Games' phases, line and announcements                                                                          |
| `call.css`, `callSlot` (inside `ChatDock`)                                                      | nothing: the slot is new, hidden without a call id                                                                                                             | —                                                                                                                   |
| `@seasonal/kit/server`: `websiteSignInCheck`, `safeNext`, `websiteLoginLocation`, `mappedRoles` | most of `apps/server/src/auth/websiteIdentity.ts` (145); `safeNext`, `proxySecret`, `toLogin` in `apps/server/src/http/routes/websiteSignIn.ts` (123)          | the route, accounts, sessions; `steps: 'each'`; answering `invalid` with 403                                        |
| `@seasonal/kit/server`: TOTP, recovery codes                                                    | `apps/server/src/auth/totp.ts` (99); `recoveryCode` and `hashOf` in `twoFactor.ts` (193)                                                                       | every SQL statement of `twoFactor.ts`; style `'grouped'`                                                            |
| `@seasonal/kit/server`: `RateLimiter`, `SessionEnds`                                            | `apps/server/src/auth/rateLimit.ts` (88, its class), `apps/server/src/auth/sessionEnds.ts` (27)                                                                | `RATE_RULES`                                                                                                        |

### Order

1. **Tokens, fonts, motion, theme** (v0.1–v0.2, the CHANGELOG's oldest notes). These change no
   markup, so they are the safest first step.
2. **Sign-in and the chat link** (v0.3).
3. **The server's sign-in and two-factor checks** (v0.8). This touches no screen.
4. **The shell parts and the disclosure** (v0.4): toggle, back link, `useDisclosure`.
5. **Fit, then the dock** (v0.4–v0.7). Then the start card and the result's frame (v0.5), then
   the bar and focus mode (v0.6).

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
- **Two-factor:** stored recovery-code hashes keep working with `'grouped'`. Run
  `adminTwoFactor.integration.test.ts`.

## Seasonal Bingo Royale

### What each export replaces

| Kit export                             | Replaces in Bingo (lines)                                                                                                                                                                                                                                                                                        | Stays in the game                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`                           | the 49 shared tokens of `packages/ui/src/tokens.css` (142)                                                                                                                                                                                                                                                       | the ball's two tokens, its arena; **its own `--gutter` and `--panel-padding` after the kit's**: they differ from Mini Games under 356 px  |
| `fonts.css`, `motion.css`, theme       | `packages/ui/src/fonts.css` (26), the shared part of `motion.css` (114), `apps/web/public/theme-init.js` (28), `apps/web/src/shell/theme.ts` (73)                                                                                                                                                                | `sbr-anim-draw`, the ball keyframes                                                                                                       |
| `ThemeToggle`, `BackLink`, `shell.css` | `apps/web/src/shell/ThemeToggle.tsx` (52); the `.shell-back` link in `AppShell.tsx` (280) and its rules and `.theme-toggle` in `shell.css` (274)                                                                                                                                                                 | the bar's layout: `order` on `.sk-back-link` and `.sk-theme-toggle`, the phone's first row                                                |
| `websiteLoginHref`, `signInAgain`      | `websiteSignInHref` and the resign in `apps/web/src/account/WebsiteSignIn.tsx` (114)                                                                                                                                                                                                                             | `useSignInToPlay`, `SignInLinks`, `SignInPage`                                                                                            |
| `WebsiteChatFrame`, `chatEmbedUrl`     | the frame of `apps/web/src/shell/ChatDock.tsx` (166)                                                                                                                                                                                                                                                             | its side panel and phone drawer, `chat.css` (101); `sandboxed={false}`                                                                    |
| `ResultFrame`                          | the frame around `components/FinalPlacement.tsx` (131)                                                                                                                                                                                                                                                           | `Podium.tsx` (51) and `podium.css` (133) as `placings`, its rank rows as `more`                                                           |
| `fit.css`                              | nothing: Bingo has no screen scale                                                                                                                                                                                                                                                                               | `data-sk-game="bingo"`: floor 1, 14 px text, 44 px targets                                                                                |
| `@seasonal/kit/server`                 | most of `apps/server/src/auth/websiteIdentity.ts` (125); `safeNext`, `proxySecret` in `http/routes/websiteSignIn.ts` (118); `totp.ts` (73); `hashOf` and the code draw in `twoFactor.ts` (151); `rateLimit.ts` (95, its class); `sessionEnds.ts` (28); `packages/contracts/src/http/steps.ts` (76) in the server | the route; `steps: 'all'`, logging `badSteps` once; `'hex'` recovery codes; answering `guest` and `invalid` with its login hop; its rules |

`DockedScreen`, `StartCard`, `GameBar` and the focus mode are not part of Bingo's plan: each
would change what its players see.

### Order

1. Tokens, fonts, motion, theme.
2. The shell parts: toggle and back link.
3. The chat frame (`WebsiteChatFrame` in its side panel).
4. The server's checks.
5. `ResultFrame` around its final placement.

### Risks and the tests to run

- **The token override.** If Bingo's `--gutter` / `--panel-padding` are not loaded after the
  kit's, a 320 px phone gets 16 px margins instead of 14.4 px. Run `minTextSize.test.ts` and the
  fit audit (`e2e/acceptance/fitAudit.spec.ts`).
- **The chat frame now sends `strict-origin`,** as GAME-INTEGRATION §5 requires. Run
  `chatDock.test.tsx` and `e2e/chatEmbed.spec.ts`.
- **The login hop's `next`** becomes the page's path, query and hash. It no longer adds `#/` to an
  empty hash; the base path is the same lobby. Run `websiteSignIn.test.tsx` and
  `websiteLogin.integration.test.ts`.
- **The server's stricter role header and user id:** the kit takes only a positive safe integer.
  Bingo's own rule allowed letters, which the website never sends. Run
  `websiteLogin.integration.test.ts`, `websiteRules.integration.test.ts` and
  `twoFactor.integration.test.ts`.

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

## Needs the owner's word

- **Mini Games and Bingo**, whether the chat frame should be sandboxed in both. Today Mini Games
  does and Bingo does not, and each keeps what it has.
- **Bingo**, whether it moves from its side panel to the docked chat strip.
- **Bingo**, whether it gets a start card, or a focus mode with the game bar.
- **Seasonal Party**, the frame's colours turning into the website's at its first step (asked by
  K4, but visible).
- **The kit**, whether `showcase` becomes a required check of master's protection.
