# Shared client parts and test tools: what the three games each built

An investigation, read-only, no code (2026-11-26). Nothing in the kit changes with this page; it
recommends, and the owner decides. It is the counterpart of
[shared-server-parts.md](shared-server-parts.md) for the browser side and the test tools.

Read on 2026-11-26 from each game's `origin/master`: Seasonal Bingo Royale `8d20904` ("Bingo"),
Seasonal Mini Games `9e3c6f3` ("Mini Games"), Seasonal Cases `073f9ad` ("Cases"). Every path below
is at those commits. Line counts are the file's lines. "Alike" is measured as in the server note: the
share of a file's code lines (blank lines and comments left out, trimmed, compared as sets) that the
other file has too, written "A in B / B in A"; a rough measure, good for ordering, not for proof. CSS
was measured with the game's class prefix taken off. All three games already use the kit
(`@seasonal/kit` is imported in Bingo's `apps/web/src/main.tsx`, Mini Games' `apps/web/src/main.tsx`
and Cases' `apps/web/src/main.tsx`), so what is listed here is what is **left** over, built by each
game next to it.

## At a glance

| Part                                                                              | Bingo                                                                              | Mini Games                                                     | Cases                                                 | Alike (Bingo/Mini Games; others)                     | Kit part worth it                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Screenshot and theme helper (tests)                                               | `e2e/screens.ts` 72                                                                | `e2e/screens.ts` 75                                            | `e2e/screens.spec.ts` 285 (own capture)               | 86 % / 77 %; Cases 27 % / 10 %                       | yes, first (tiny)                  |
| Fit probe and size × font sweep (tests)                                           | `e2e/acceptance/fitProbe.ts`, `fitMeasure.ts`, `layoutChecks.ts` 211               | `e2e/contrast.ts` 188 (pixel contrast), two `AxeBuilder` specs | `screens.spec.ts` (smallest text, overflow, ellipsis) | 22 % / 18 % (probe vs contrast); the sweep is pasted | yes, first (medium)                |
| Static guards (no fixed colours, tokens, text floor)                              | `noFixedColours.test.ts` 43, `designTokens.test.ts` 192, `minTextSize.test.ts` 121 | `noFixedColours.test.ts` 42, `designTokens.test.ts` 255        | none                                                  | 100 % / 100 %; 80 % / 71 %                           | yes, tiny                          |
| Steps beside a name in lists                                                      | `components/StepBadges.tsx` 67                                                     | `round/PlayerSteps.tsx` 47                                     | `stage/Badges.tsx` 23 (a different shape)             | 33 % / 31 %; Cases 21 % / 33 %                       | yes, small                         |
| Countdown from a server time                                                      | `useSecondsUntil.ts` 29 (client clock)                                             | `live/useTicker.ts` 28 + `serverNow` in `live/socket.ts`       | none                                                  | 47 % / 50 %                                          | yes, tiny, with MG's clock         |
| API client and its errors                                                         | `shell/http.ts` 81                                                                 | `shell/http.ts` 82                                             | `lib/api.ts` 32                                       | 73 % / 72 %; Cases 20 % / 33 %                       | yes, medium                        |
| Loading / failed / ready hook                                                     | `league/useApiGet.ts` 46                                                           | `boards/useApi.ts` 51                                          | `lib/useAction.ts` 40 (a button's call, another job)  | 42 % / 41 %                                          | yes, with the API client           |
| Website stand-in for browser tests                                                | `e2e/websiteStack.ts` 300                                                          | `e2e/websiteStub.ts` 280 + `websiteStack.ts` 172               | `e2e/websiteStub.ts` 164 + `stubShared.ts`            | 20 % / 17 %; Cases 19 % / 21 %                       | yes, later (large)                 |
| Game socket client (intents, seq)                                                 | `game/socket.ts` 48                                                                | `live/socket.ts` 87                                            | `lib/feed.ts` 140 (a show's feed, other events)       | 73 % / 42 %                                          | maybe (needs a peer dependency)    |
| Base components CSS (button, panel, field, chip)                                  | `packages/ui/src/base.css` 207 (`sbr-`)                                            | `packages/ui/src/base.css` 294 (`smg-`)                        | `shell/shell.css` `.button` (own)                     | 67 % / 57 % without the prefix                       | yes, as `sk-` CSS, medium          |
| Season icons                                                                      | `components/SeasonIcon.tsx` 77                                                     | `season/SeasonIcon.tsx` 62                                     | none                                                  | 49 % / 59 %                                          | maybe (assets are the website's)   |
| Sign-in, register, account forms                                                  | `account/formParts.tsx`, `SignIn.tsx`, `Register.tsx`, `AccountPage.tsx`           | the same names                                                 | `screens/SignIn.tsx`, `fields.tsx` (own)              | 92 % / 94 %, 80 % / 70 %, 83 % / 85 %, 34 % / 40 %   | no (game logic, standalone only)   |
| Session state on the client                                                       | `shell/session.tsx` 169                                                            | `shell/session.tsx` 159                                        | `lib/session.ts` 42                                   | 55 % / 52 %; Cases 13 % / 27 %                       | no (too different)                 |
| Router                                                                            | `shell/router.ts` 173 (hash)                                                       | `shell/router.ts` 128 (hash)                                   | `lib/router.tsx` 83 (History API)                     | 41 % / 46 %; Cases 15 % / 17 %                       | no (routes are the game's)         |
| Fixtures, builders, sign-in helpers (tests)                                       | `test/matchFixture.tsx` 167, `e2e/realGame.ts` 172                                 | `round/fakes.ts` 94, `e2e/play.ts` 258                         | `testing/views.ts` 144, `e2e/helpers.ts` 112          | 12 % / 13 %; 16 % / 15 %                             | no (game-specific)                 |
| Playwright config and stack                                                       | `e2e/playwright.config.ts` 101, `devStack.ts` 70                                   | `e2e/playwright.config.ts` 166, `testStack.ts` 65              | `e2e/playwright.config.ts` 106, `server.ts` 66        | 60 % / 44 %; 63 % / 68 %                             | no (ports and projects)            |
| Dialogs, toasts, tables, avatars, empty and error screens, connection-lost notice | not built as shared parts                                                          | not built as shared parts                                      | not built as shared parts                             | —                                                    | nothing to extract; see section 13 |

## 1. Screenshot and theme helper (test tool)

- **Files:** Bingo `e2e/screens.ts` (72 lines), Mini Games `e2e/screens.ts` (75). Both export
  `SHOTS_DIR`, `DESKTOP` (1280×800), `PHONE` (390×844), `setTheme(page, theme)` (press the header's
  `theme-toggle` until `<html data-theme>` matches), `captureThemes` and `captureLook` (both sizes, both
  themes, one element scrolled to the middle). Bingo's header says "Used by the Playwright specs";
  Mini Games' says "Used by `./account.spec`, `./contrast` (setTheme)". 86 % / 77 % alike.
- **Where they diverge, and which is right:** Mini Games' `setTheme` sets `data-theme` on `<html>`
  directly when the toggle is hidden (a round's focus mode hides the header, its line 36 to 41), and
  waits a fixed 400 ms for the buttons' 160 ms fade (line 45). Bingo waits until no animation runs
  (`document.getAnimations().every(a => a.playState !== 'running')`, its line 35 to 37). **Bingo's wait
  is right** (no fixed sleep, and it cannot be early), **Mini Games' focus-mode fallback is needed**
  by any game with a focus bar.
- **Cases** takes its pictures inside one spec (`e2e/screens.spec.ts`, 285 lines: sizes 1536×768,
  1280×720, 390×844 and 360×780, light and dark, into `.local/screens/proto-v5/`); it switches the
  theme in its own way. It would use the helper for its theme switch and capture only.
- **A kit part:** a test entry, `@seasonal/kit/e2e` (optional peer `@playwright/test`, no runtime
  dependency), with `setTheme`, `captureLook` and the two sizes as constants; `SHOTS_DIR` stays a
  parameter. About 70 lines.
- **Effort:** small. **Each game would change:** delete its `screens.ts` and import (Bingo and Mini
  Games), or replace the theme switch (Cases).
- **In the kit?** Yes: first, because the two copies are already the same file and it is the base of
  section 2.

## 2. The fit probe and the size × font sweep (test tool)

- **Files, Bingo:** `e2e/acceptance/fitProbe.ts` (the in-page measurement of "small text, cut text,
  overflow, page scroll, overlaps"; its header), `fitMeasure.ts`, `layoutChecks.ts` (211, standings
  rows that cover each other, ball letter against circle), `acceptance/websiteSweep.ts` (the website
  sweep: ten sizes, light and dark, chat closed and open, `AxeBuilder` for WCAG 2 A and AA).
  **Pasted into specs:** the loop "both sizes at 100, 125 and 150 % (`font-size` 16, 20, 24 px on
  `<html>`) and `expect([p.smallText, p.cut, p.overlaps, p.hScroll]).toEqual([[], [], [], false])`" is
  written out again in `e2e/adminAccounts.spec.ts` line 37, `adminHistory.spec.ts` 38,
  `adminLeague.spec.ts` 39, `adminOverview.spec.ts` 38, `adminPresets.spec.ts` 40,
  `adminScreens.spec.ts` 36, `adminTechnical.spec.ts` 36 and `startMatch.spec.ts` 36; the font is also
  set at `hostNav.spec.ts` 201, `playerFit.spec.ts` 215 and `topBar.spec.ts` 86.
- **Files, Mini Games:** `e2e/contrast.ts` (188 lines: contrast of every visible text on the
  rendered pixels, because axe leaves text on translucent cards "incomplete"; its header), and
  `@axe-core/playwright` in `e2e/access.spec.ts` line 17 and `e2e/mindGames.spec.ts` line 30. No
  large-font sweep in `e2e`.
- **Files, Cases:** `e2e/screens.spec.ts` line 65 measures the smallest visible text, sideways
  overflow, ellipsis cuts and the artifact's centre, at four sizes, writing `checks.json`. No axe, no
  large-font run (`git grep` for `AxeBuilder|fontSize` over `e2e` finds only line 65).
- **How alike:** the probe (Bingo) against the contrast check (Mini Games) 22 % / 18 %: they measure
  different things. The pasted sweep is 100 % the same code eight times in one game. The kit's own
  showcase already does the same kind of measuring (`showcase/cases.spec.ts`, `layout.spec.ts`), by
  hand and again.
- **Where they diverge, and which is right:** the sizes: Bingo 1280×720 and 390×844 at 100, 125, 150 %;
  its website sweep ten sizes; Cases 1536×768, 1280×720, 390×844, 360×780; Mini Games 1280×800 and
  390×844. The 200 % root font the owner asked for (32 px) is in none of the games' sweeps (Bingo's
  largest is 24 px, 150 %; `git grep` over the three `e2e` folders). **Bingo's probe is the right base**
  (it names what failed: `smallText`, `cut`, `overlaps`, `hScroll`), with **Mini Games' pixel contrast
  as a second check**, and axe on top.
- **A kit part:** in `@seasonal/kit/e2e`: `probe(page)` (Bingo's in-page function, game-neutral: it
  reads the game's floor from `--sk-floor-text` instead of "14 px"), `sweep(page, { sizes, fonts,
themes, axe })` that runs a screen through every size, both themes and 100 % and 200 % font, and
  returns one report, and `contrast(page)` (Mini Games'). `@axe-core/playwright` stays an optional peer.
- **Effort:** medium (the probe is 250 lines of in-page code with its own tests to keep).
  **Each game would change:** Bingo replaces eight copies with one call; Mini Games gains a font
  sweep it does not have; Cases gains axe and the 200 % run.
- **In the kit?** Yes. It is the part of this note with the clearest pay-off: the owner's own check
  (size, font, theme, axe) is written once per screen, and the kit's showcase repeats it.

## 3. Static guards: no fixed colours, tokens, text floor

- **Files:** `apps/web/src/noFixedColours.test.ts` in Bingo (43 lines) and Mini Games (42):
  **100 % / 100 %**, scanning every `.tsx` for a hex colour outside comments. `designTokens.test.ts`
  Bingo 192, Mini Games 255: 80 % / 71 %; Bingo's already imports the kit (3 `@seasonal/kit` hits).
  `minTextSize.test.ts` Bingo 121 (2 kit hits), none in Mini Games or Cases.
- **Where they diverge:** the token names (`--color-*` in the games' own `packages/ui`, `--sk-*` in the
  kit) and the folders scanned. Cases has none of the three.
- **A kit part:** pure functions in `@seasonal/kit/e2e` or `@seasonal/kit/devtools`:
  `findFixedColours(dir)`, `findUnknownTokens(css, tokens)`, `findSmallText(css, floor)`; each game
  keeps a three-line test that calls them. No peer.
- **Effort:** small. **Each game would change:** the two files become three lines each; Cases gains
  the guards.
- **In the kit?** Yes, tiny; the only identical file pair found.

## 4. Steps beside a name in lists and boards

- **Files:** Bingo `components/StepBadges.tsx` (67 lines): `StepBadges`, a context (`StepsByName`,
  `NameSteps`) so every ranked row of a match shows its player's steps; used in `components/RankRow.tsx`
  line 21, `game/MatchScreen.tsx` line 29, `game/WaitingRoom.tsx` line 20,
  `league/LeaderboardPage.tsx` line 182, `league/ProfilePage.tsx` line 59. Mini Games
  `round/PlayerSteps.tsx` (47): used by `round/PlayerName.tsx` line 52, `round/GuessLine.tsx` 177,
  `boards/PlayerBoard.tsx` 64, `boards/ProfilePage.tsx` 152 and the standings. Cases `stage/Badges.tsx`
  (23): `badges: string[]`, an address check against the contract's `BadgeSchema`, `aria-hidden`; used in
  `shell/ShellBar.tsx` line 60, `board/RegistrationBoard.tsx` 63, `stage/CaseToken.tsx` 45,
  `stage/LowerThird.tsx` 65.
- **How alike:** Bingo / Mini Games 33 % / 31 %; Cases 21 % / 33 % and 16 % / 33 %.
- **Where they diverge, and which is right:** the accessible name. Bingo writes "Holder: Diamond
  holder" as visually hidden text and a title (`LADDER_NAMES`, its lines 23 to 27 and 55 to 62); Mini
  Games gives the icon `alt={s.name}` and, **for a step without an icon, shows the name as small
  text** (its lines 28 to 31); Cases hides the badges from assistive technology (`aria-hidden`, line 17) because the name beside carries the meaning, and **it has no ladder or name at all, only an
  address**. The kit's header chip (since v0.19.0) has the third form: the step's name as the icon's
  text alternative, 20 px, `Step` from `src/stepShape.ts`. **The kit's chip is the right model**
  (named, the same shape the website sends), and Mini Games' text for an icon-less step is the right
  fallback.
- **A kit part:** `StepBadges({ steps })` in `@seasonal/kit/react`, the chip's own markup and size,
  with the icon-less fallback; the match-wide context stays Bingo's (a screen's wiring). The check of
  the icon address stays where the server's contract is (Cases' `BadgeSchema`).
- **Effort:** small. **Each game would change:** Bingo and Mini Games swap one component; Cases maps
  its `badges: string[]` to `Step[]` when the website's contract sends the full step (today it sends
  addresses only).
- **In the kit?** Yes: every list of players in website mode needs it, the header has it, and three
  looks of one thing is a defect the website's members see.

## 5. Countdown from a server time

- **Files:** Bingo `useSecondsUntil.ts` (29): whole seconds to a server time, every 250 ms, from
  `Date.now()` (line 17). Mini Games `live/useTicker.ts` (28, "adapted from Bingo's
  useSecondsUntil.ts"): only re-renders; the time itself is read from `serverNow()`
  (`live/socket.ts` line 68), which adds an offset measured with three `time.sync` round trips, the
  shortest kept (`syncClock`, lines 72 to 87). Cases has no countdown and no use of the clock
  (`git grep` for `serverNow|Date.now` over `apps/web/src`: none).
- **How alike:** 47 % / 50 %.
- **Where they diverge, and which is right:** Bingo counts to a server time with the **page's own
  clock**: a visitor whose clock is a minute off sees a wrong countdown to a match start (the server
  starts rounds on its own, so it is display only). **Mini Games' offset is right.**
- **A kit part:** `useCountdown(at, { now })` and a pure `clockOffset(samples)`; the kit already has
  `clockText` (`@seasonal/kit`, used by Cases' `kit.test.ts`). The `time.sync` intent stays in the
  game's socket. About 40 lines.
- **Effort:** tiny. **Each game would change:** Bingo passes a `now` from a synced offset (it has no
  `time.sync` today, so it also needs the intent); Mini Games swaps one hook.
- **In the kit?** Yes, tiny, mainly to give Bingo the right clock.

## 6. API client and its errors

- **Files:** Bingo `apps/web/src/shell/http.ts` (81): `BASE_PATH`, `ApiError(status, code, reason)`,
  `api(path, { method, body })` with the CSRF token on every non-GET (line 69), JSON in and out,
  `204` → `undefined`, and `onSessionLost` / `reportSessionLost` when a `401` or `CSRF_INVALID` says the
  session ended (lines 44 to 60). Mini Games `shell/http.ts` (82): the same, plus a `refusal` on
  `ApiError` for a refused setting and, instead of its own listener set, the kit's `signInAgainAfter`
  with the contract's `SESSION_ENDED_HEADER` (its lines 20 to 21). Cases `lib/api.ts` (32): `getJson`
  and `postJson`, the server's `error` sentence as an `Error`, no CSRF token (its server guards writes
  by the request's origin, `app.ts` `sameSiteWrites`), absolute paths.
- **How alike:** Bingo / Mini Games 73 % / 72 %; Cases 20 % / 33 % and 22 % / 38 %.
- **Where they diverge, and which is right:** session loss: Mini Games' use of the kit's
  `signInAgainAfter` is right (one place, the website's own sign-in); Bingo keeps a listener set. The
  CSRF header and the 401 rule follow the server's cookie and CSRF helper (K60, K63), so a client part
  has to follow the same two modes (a token, or the origin check). Cases' answer carries a sentence
  (`error`), the other two a code the client turns into a sentence (`accountText.ts`): two designs, so
  the part cannot own the error text, only the shape.
- **A kit part:** `createApi({ basePath, csrf?: () => string | null, onSessionEnded })` returning
  `api()` and `ApiError` (`status`, `code`, `reason`, and the raw body for a game's extra fields);
  `basePathOf` too, which both games copy character for character (`http.ts` lines 19 to 23 in
  Bingo, 25 to 29 in Mini Games).
- **Effort:** medium (the error shape is the careful part). **Each game would change:** Bingo and Mini
  Games replace a file with a call; Cases gets a code-bearing error only if its server changes, so it
  adopts the helper without the error part.
- **In the kit?** Yes, but after sections 1 to 5: the games' versions differ where the server's own
  contract differs, so it needs the owner's word on the error shape.

## 7. Loading, failed and ready

- **Files:** Bingo `league/useApiGet.ts` (46): `Loaded<T>` is `idle | loading | failed(code) |
ready(value)`, an older answer arriving late is dropped (`live` flag, lines 30 to 43), a network failure
  becomes the code `ERROR`. Mini Games `boards/useApi.ts` (51): `{ data, error }` with the full
  `ApiError`, a network failure becomes `ApiError(0, 'NO_ANSWER')`, and the answer is tied to the path it
  was asked for (`loaded.path === path`), so a screen never shows the previous path's data;
  `withGame` adds a board's game filter. 42 % / 41 % alike. **Mini Games' is right** (the whole error,
  no flash of old data). Cases `lib/useAction.ts` (40) is a different job
  (`run(action)`, `busy`, `error` for a button) and has a `feed.ts` `useCurrentShow` that polls every
  3 s (`POLL_MS`, line 29).
- **Where they diverge:** the screens that show the three states are each the game's (leaderboard and
  profile in both, `league/LeaderboardPage.tsx` 195 lines and `boards/LeaderboardPage.tsx` 93: 16 % /
  23 % alike), so there is **no shared loading, empty or error screen**; only the hook is shared.
- **A kit part:** `useApiGet(path, api)` next to section 6, and `useAction()` as Cases has it (a
  button's busy and refusal). The look of the three states stays the game's.
- **Effort:** small, with section 6. **In the kit?** Yes, with section 6, and no component.

## 8. Website stand-in for browser tests

- **Files:** Bingo `e2e/websiteStack.ts` (300): a game server in website mode behind a stand-in of
  the website's proxy (`/login`, `/embed/chat`, `/games/bingo/auth/website`; the `stub_user` cookie
  becomes the four `X-Acting-User*` headers plus the proxy secret; client-sent identity headers are
  stripped; a database per worker). Mini Games `e2e/websiteStub.ts` (280) and `websiteStack.ts` (172):
  the same contract for its own header names (`X-Smg-Proxy-Secret`, `X-Acting-Guest`), `authorize`,
  the account-changes feed with the sync token, an nginx container with the game's route file. Cases
  `e2e/websiteStub.ts` (164) "after the pattern of Mini Games' e2e/websiteStub.ts", with
  `stubShared.ts`, `/media/step-icons/…`, Vite in middleware mode.
- **How alike:** 12 % to 21 % between any two: they share the **contract** (identity headers, the
  login hop, `se.sid`, the chat page, a step icon) and differ in everything around it (database,
  nginx, ports).
- **Where they diverge, and which is right:** each stubs the contract as it was when the game was
  written, and the headers were renamed per game. All three drop client-sent identity headers (Bingo's
  header says so, Cases' says "the browser's identity headers are dropped"); only Mini Games' stub
  also checks that the proxy secret never reaches the website (its header, "500 (the secret must never
  reach the website)"). **Mini Games' list of rules** (403 without the original method,
  500 if the secret reached the website, 204 plus headers for a member, 204 with `X-Acting-Guest` for
  anyone else, never 401) is the most complete and is the website's own.
- **A kit part:** `startWebsiteStandIn({ gamePath, headers, members })` in `@seasonal/kit/e2e`:
  only the contract half, on `node:http`, with the kit's own header names from `IDENTITY_HEADERS`
  (`src/server/identity.ts`). The stack around it (databases, nginx, ports) stays each game's.
- **Effort:** large (it has to track the website's contract; the kit's server half already does, so
  the two can be tested against each other). **Each game would change:** each swaps the contract half
  of a 160 to 300 line file for one call.
- **In the kit?** Yes, later: it is the integration risk (a renamed header passes every unit test),
  and the kit can test its `websiteSignInCheck` against it. Not before sections 1 to 3.

## 9. The game socket client

- **Files:** Bingo `game/socket.ts` (48): one `io('/play', { path: <base>/ws, transports:
['websocket'] })`, `resetSocket()` after a sign-in, `intent(t, data)` with a growing `seq`, a 5 s
  acknowledgement timeout and `NO_ANSWER` on failure, `UNAUTHORIZED` reports the session lost. Mini
  Games `live/socket.ts` (87): the same plus `time.sync` and a `GET /session` after a refused
  handshake. Cases `lib/feed.ts` (140): socket.io too, but for one show's views and an applause
  count, watching again after every reconnect (line 112), a poll for the current show every 3 s.
  Mini Games also has `live/retry.ts` (48: a refused load is tried again after 1 s when it was a 429 or
  a 5xx), which Bingo has no copy of (`useLiveMatch.ts` 104 lines, 4 % / 12 %).
- **How alike:** Bingo / Mini Games 73 % / 42 %; Cases 19 % / 6 %.
- **Where they diverge, and which is right:** Mini Games' version is Bingo's with the clock and the
  handshake rule added ("Adapted from Bingo's game/socket.ts", its header), so **Mini Games' is right**.
  Cases' events are its own. None of the three shows a **"connection lost" or "reconnecting" notice**:
  they rely on socket.io's own reconnect (`git grep -i "reconnect|connect_error|offline"` over the
  three clients finds only the lines above).
- **A kit part:** a factory `createGameSocket({ basePath, namespace, onUnauthorized })` returning
  `socket()`, `reset()`, `intent()`. It brings `socket.io-client` in as a peer, which the kit has none
  of, for two games' worth of 48 lines.
- **Effort:** medium. **Each game would change:** Bingo and Mini Games replace a file.
- **In the kit?** Maybe, only after the owner decides whether the kit takes a socket peer. The protocol
  (`t`, `seq`, `data`, the acknowledgement) is the games' own contract; one game (Cases) does not
  use it.

## 10. Base components CSS: button, panel, field, chip

- **Files:** Bingo `packages/ui/src/base.css` (207 lines, class prefix `sbr-`): `sbr-btn`
  (`--primary`, `--danger`, `--big`), `sbr-panel`, `sbr-field` and `sbr-input`, `sbr-chip`,
  `sbr-badge-live`, `sbr-visually-hidden`, `sbr-stack`, `sbr-row`, a 3 px focus ring and a 44 px floor.
  Mini Games the same path (294 lines, prefix `smg-`) with a locked-field look (`smg-field-lock`, line 209) and a field error line. Cases has its own `.button` and `.button-solid` in
  `apps/web/src/shell/shell.css` lines 94 and 115 and passes `buttonClassName="button"` to the kit's
  header.
- **How alike:** 67 % / 57 % with the prefixes taken off (raw: 53 % / 47 %).
- **Where they diverge, and which is right:** Mini Games has the locked-field and the error line, which
  Bingo lacks, so **Mini Games' is the superset**; the kit already has the floor tokens, `sk-bar-button`,
  `sk-visually-hidden` and the header's buttons, so buttons exist in the kit three times today
  (`sk-bar-button`, and the two games' own).
- **A kit part:** `css/components.css` with `sk-btn`, `sk-panel`, `sk-field`, `sk-input`, `sk-chip`
  (the prefix rule, tests/prefix.test.ts); `sk-bar-button` would build on `sk-btn`.
- **Effort:** medium: a look change in every game, and the buttons in the header and bar already
  styled by the kit would move onto it. **Each game would change:** rename its classes (a mechanical
  edit) and drop its `base.css`.
- **In the kit?** Probably yes, but it is a design decision (the website's look on forms), so the
  owner's word first and a look review in the showcase.

## 11. Season icons

- **Files:** Bingo `components/SeasonIcon.tsx` (77): `SeasonIcon` with an earned and a "not collected"
  white ring (`season-ring`, the `earned={false}` branch) and an `ink` silhouette; `seasonIcons.ts` (24).
  Mini Games `season/SeasonIcon.tsx` (62) with a `mono` mask version, `season/season.ts` (58). Cases:
  none. **49 % / 59 % alike.**
- **Assets:** `assets/brand/emblem.webp` is the **same file in all three** (git blob `c3aa47d` in each),
  `assets/brand/logo.svg` the same in Bingo and Mini Games (`18e3761`), and the four
  `assets/seasons/*.svg` **differ byte for byte** between Bingo and Mini Games (for example
  `spring.svg` `35b12c3` against `9ffafb5`), though `assets/seasons/source/spring.svg` and
  `summer.svg` are identical (`b6de0d8`, `8c8d673`).
- **Where they diverge:** the not-collected ring is Bingo's (its own game rule); `mono` is Mini Games'.
  Which SVG is the website's own is not known from here.
- **A kit part:** the four icons as an asset set and a `SeasonIcon` with `season`, `size` and `mono`;
  the "not collected" ring stays Bingo's. The icons come from the website (as the colours do), so the
  kit would take them from the website's master, not from a game.
- **Effort:** small for the component, but the question of which SVGs are the website's is the
  owner's. **In the kit?** Maybe: ask the website's repository which icons are final first.

## 12. Sign-in, register and account forms, session state, router

These are **built twice and should stay in the games**.

- **Forms:** `account/formParts.tsx` is 92 % / 94 % alike (Bingo 90 lines, Mini Games 88), `Register.tsx`
  83 % / 85 %, `SignIn.tsx` 80 % / 70 %, `accountText.ts` 51 % / 64 %, `AccountPage.tsx` 34 % / 40 %.
  Cases' `screens/SignIn.tsx` (64) and `screens/fields.tsx` (105) are 18 % to 27 % alike. Mini Games
  has a richer field set in `components/fields.tsx` (290 lines: a number field that keeps the text as
  typed, a locked look, an alert for a server-named problem).
- **Why not:** these screens exist in **standalone** installs only; in website mode sign-in is the
  website's (the kit's `websiteSignInHref` / `signInAgainAfter`, used by Mini Games' `SignIn.tsx`
  line 17). The messages ("wrong e-mail or password, one answer") and the limits come from each game's
  own contract (`@sbr/contracts`, `@smg/contracts`), and the kit's server side states that "accounts,
  sessions and every database statement stay in the games" (`src/server/index.ts`). A kit form would
  have to be generic over the contract, which is the part that differs. If a fourth standalone game
  appears, `formParts` is the file to lift (it is nearly one file already).
- **Session state:** `shell/session.tsx` Bingo 169 and Mini Games 159 lines, 55 % / 52 %, but they
  hold different things (Bingo: limits and screens from admin settings; Mini Games: handoff sign-in,
  account deletion, guest watch session); Cases `lib/session.ts` (42) is `Me | null | undefined`.
  13 % to 27 % with Cases. **Too different, and mostly game logic.**
- **Router:** Bingo and Mini Games use the URL hash (`shell/router.ts` 173 and 128 lines, 41 % / 46 %);
  Cases uses the History API with a base path and a `Link` (`lib/router.tsx`, 83 lines, 15 % to 17 %).
  Two different designs of one small thing, and the routes are the game. Not a kit part.

## 13. Searched for, and not found

The brief asked for these; none was found as a part built twice, so there is **nothing to extract**.
Each search was `git grep` over the three clients' `apps/web/src` (and `games/*/web`, `packages/ui`).

- **Confirm dialogs and modals:** `role="dialog"` / `alertdialog` / `<dialog>` / `showModal` /
  `confirm(` appears only in Mini Games `apps/web/src/round/FocusPanel.tsx` and
  `games/seasonal-target/web/Loupe.tsx`; Bingo and Cases have none. Destructive actions confirm
  in-page.
- **Toasts and notices:** every game uses `role="status"` or `role="alert"` or `aria-live` in its own
  places (Bingo 23 files, Mini Games 14, Cases 16), as a line in the page; no toast component exists
  in any of them. A shared "notice line" would be a new part, not an extraction.
- **Tables, avatars, name chips:** Bingo `components/RankRow.tsx` (95) and Mini Games
  `round/PlayerName.tsx` (55) are the name-with-steps rows (28 % / 28 %), standings are 13 % to 17 %
  alike across all three (`Standings.tsx` 160, `RoundStandings.tsx` 113, `Scoreboard.tsx` 99), and no
  game has an avatar. Game logic.
- **Empty, loading and error screens:** only the hook (section 7); the screens are each page's own.
- **Connection lost / reconnecting notice:** none in any game (section 9).
- **Theme switch:** already the kit's (`ThemeToggle`, `useTheme`, `storeTheme`, `resolveTheme`, used
  in all three: Cases `packages/ui/src/kit.test.ts`); the test-side `setTheme` is section 1.
- **Chat frame:** already the kit's (Bingo `shell/DockedChat.tsx` and Mini Games
  `chat/useHostChatFrame.ts` import it; Cases `packages/ui/src/pending/useChatHandOver.ts` is a small
  hook beside it); 4 % to 21 % alike, game wiring.
- **Test data builders, fixtures, dev sign-in helpers, Playwright config:** 3 % to 16 % alike
  (`quickTestFixture.ts` / `guessGames.ts` 3 % / 7 %, `matchFixture.tsx` / `fakes.ts` / `views.ts`
  8 % to 15 %, `realGame.ts` / `play.ts` / `helpers.ts` 12 % to 16 %), 60 % / 44 % for the Playwright
  configs, whose differences are ports and projects. Game-specific: a builder knows the game's state.
  The development sign-in **screen** is already the kit's `DevSignIn` (`src/react/dev`), used by
  Bingo's `shell/DevTools.tsx` and Mini Games' `shell/DevTools.tsx` (55 % / 72 % alike, the rest is
  each game's identities).
- **A smaller finding:** Cases' `packages/ui/src/kit.test.ts` ("proves the pinned kit": every entry
  imports, every stylesheet is present) is a one-file consumer smoke test; Bingo's
  `apps/server/test/productionBundle.test.ts` is another. The kit's delivery proof does this on the
  tag, so it is covered at the source.

## Recommended order

1. **The screenshot and theme helper, and the static guards** (sections 1 and 3): two near-identical
   file pairs (86 % / 77 % and 100 % / 100 %), no dependency beyond an optional peer, no look change,
   and the base for the next step. Smallest work, surest pay-off.
2. **The fit probe and the size × font sweep** (section 2): written out eight times in Bingo, absent in
   two games, and the owner's own checklist (size, 200 % font, theme, axe); the kit's showcase does it
   by hand too. Needs the helper of step 1.
3. **Steps in lists** (section 4): three looks of one website feature, the header already has the
   right one; small and visible to members.
4. **The countdown with the server's clock** (section 5): tiny, and it fixes Bingo's wrong-clock
   countdown; do it with step 3 as one release if the owner wants fewer releases.
5. **The API client and the loading hook** (sections 6 and 7): real duplication (73 %) but the error
   shape follows the server's contract and Cases differs, so it waits for the owner's word on the shape.
6. **The website stand-in** (section 8): large and it must track the website, but a renamed header
   passes every unit test; best built once the kit's tests can run against it.
7. **Base components CSS** (section 10): a design decision across every screen of two games; needs the
   owner's look review first.
8. **The socket client and the season icons** (sections 9 and 11): both wait on a decision that is not
   code (a socket peer dependency for the kit; which SVGs are the website's).

Not for the kit: sign-in, register and account forms, session state, the router, fixtures and
builders, the Playwright config and stacks, dialogs, toasts, tables and the notices nobody built
(sections 12 and 13).

Separately, and not a kit matter: Bingo's `useSecondsUntil` counts on the page's own clock; and the
two games' season SVGs differ byte for byte, which may or may not be intended.

## 14. Follow-up: the socket client's cost, and whose the season icons are (2026-11-26)

Read-only, recommendations only. Since this note was written, v0.23.0 to v0.26.0 built its first
five candidates and the website stand-in.

### The socket client as a kit part

- **What a kit part would bring in:** `socket.io-client` as an optional peer (all three games pin
  `4.8.4`: Bingo `8d20904`, Mini Games `9e3c6f3`, Cases `073f9ad`, `apps/web/package.json`). MIT, as
  are its dependencies `engine.io-client` 6.6.7, `socket.io-parser` 4.2.7 and `engine.io-parser` 5.2.3
  (read in Mini Games' install). The browser bundle is 40 759 bytes, 12 945 gzipped
  (`dist/socket.io.esm.min.js`); `ws` and `xmlhttprequest-ssl`, listed by `engine.io-client`, serve
  Node only.
- **What it would be:** the factory of section 9 (one socket under the base path, `reset`, `intent`
  with a growing `seq` and a timeout), with the clock from `clockOffset` (in the kit since v0.24.0):
  about 60 lines, and with them the games' wire contract (`t`, `seq`, `data`) written into the kit.
- **Recommendation: do not build it yet.** Two games share about 48 lines of it, Cases speaks other
  events, and the part would freeze one protocol in the kit. Take it up when a third game uses the
  intent protocol; until then Bingo takes Mini Games' `syncClock` and feeds the kit's
  `clockOffset`.

### The season icons

- **The website's files** are `client/src/assets/seasons/{spring,summer,autumn,winter}.svg` and
  `client/src/assets/seasons/source/*.svg` (website `cc743b9`), beside
  `client/src/assets/seasonal-tokens.svg` and `client/public/brand/emblem.webp`.
- **Who carries them:** Bingo's eight season files are **byte for byte the website's** (the same git
  blobs, e.g. `spring.svg` `35b12c3`). **Mini Games' differ** in all four optimized files and in
  `source/autumn.svg` and `source/winter.svg` (its `assets/README.md` says it copied them from Bingo at
  `d294585`). The emblem (`c3aa47d`) is the same file in the website, Bingo, Mini Games and Cases.
- **Recommendation: ship them in the kit, do not link them.** A standalone game has no website to
  link to, and linking would widen every game's content security policy. Ship the website's four
  optimized files in the kit, compared in CI against the website's `master` as the season colours
  are, with a small `SeasonIcon`; Mini Games would then show the website's current drawings. The
  licence note of the games' `assets/README.md` (the icons belong to the Seasonal Tokens project and
  are not under the AGPL) moves with them. **This needs the owner's word.**
