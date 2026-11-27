# Backlog

Part one is what is open, each item with what "done" means. Part two is what is closed, each item
with what closed it. A closed item moves from part one to part two in the same commit that closes
it, and keeps its number. [OPEN.md](OPEN.md) is the short page over part one.

## Part one — open

Each item keeps its number for good, so the lists are bullets with the number in bold: a
numbered Markdown list would be renumbered by the formatter once an item closes.

- **5. Adopt the kit in the games:** Mini Games first, then Bingo Royale, then Seasonal Party,
  each in its own PR with the owner's approval, following the CHANGELOG's migration notes. Done
  when: each game pins a kit tag and has removed its own copies of the moved parts. The plan per
  game, with paths, order, risks and tests, is [ADOPTION.md](ADOPTION.md) (2026-11-21). State
  (checked 2026-11-25 on each `master`): Mini Games `1988346` pins v0.18.0 (PRs #53 to #55) and is
  adopted; Bingo Royale `2380ea7` and Seasonal Cases `073f9ad` pin v0.11.1; Seasonal Party
  `a09f803` pins none.
- **9. React wrappers.** What is left of it: `ChatDock` and the call slot, the shared call's
  included (`onSharedCall`, v0.37.0: no game uses it yet). In the kit since v0.4.0
  with tests. Done when: a game uses them. Checked 2026-11-25: Mini Games `1988346` uses
  `DockedScreen` with `withoutChat` (`apps/web/src/match/DockedMatch.tsx` line 54), so no dock and
  no call slot; Seasonal Cases `073f9ad` uses `useDockReserve` and `useFitScale` only; Bingo's
  `master` has its own `ChatDock` around the kit's frame. The chat frame's link (9a) and the
  dock's arrivals and `DockedScreen` (9b) are closed (part two).

- **14. Framing a host chat from another https origin** (Mini Games T412). Deferred (decided
  2026-11-23): not built, and not planned for a release until the owner takes it up. Today
  `OriginChatFrame` is local development only (K32). Done when: the owner takes it up, and the
  kit has it with a test and a security pass.

- **72. A blocking scan would fail on any ZAP warning** (K113, 2026-11-27). `scan.yml` counts
  ZAP's exit 1 and 2 alike as findings; the decision blocks on high and critical only (Trivy
  already scans those two). Done when: with `blocking`, only a high or critical finding fails the
  run, with a test, before the first game's production turns it on.
- **73. The result's first part keeps its height in a narrow place at large text** (seen
  2026-11-27 in Mini Games' `round/largeText.css`, which sets it to `auto`; `css/frames.css`
  `.sk-result-first`, board layout). Not among the findings of this release. Done when: the part
  grows with its content there, measured at 200 %, and the game's rule can go.

## Part two — closed

- **Delivery proof** (2026-11-20). A git dependency on a tag works with committed `dist/` and no
  install script, in a Vite build, a Vitest test and a typecheck. Closed by v0.0.1 (`07a8484`) and
  [DELIVERY.md](DELIVERY.md).
- **Project standards** (2026-11-20, DECISIONS K2). Repository files, living docs, supply-chain
  rules, security and quality CI, and the pre-commit hook. Closed by the bootstrap commits on
  `master` (`3c9ccf0`, `b1fb48c`) and PR #1 (osv-scanner's first finding fixed).
- **1. Design basics** (2026-11-20, DECISIONS K3, K7). The 49 shared tokens, the season colours
  from the website, the shared motion with `sk-`, and the theme logic with its early script and
  Vite plugin. Tests cover the tokens, the prefix, the season check, the contrast check and the
  theme behaviour; CI checks the season colours and the contrast. Closed by PR #2 and v0.1.0.
- **6. First security pass** (2026-11-20). gitleaks over all refs, osv-scanner, CodeQL, install
  behaviour, package contents and binary assets: no finding
  ([security-pass.md](security-pass.md)). Closed by PR #3, before v0.2.0.
- **7. Fonts** (2026-11-20, DECISIONS K8). The owner approved shipping Luxora Grotesk in the kit;
  it is not under the AGPL. `css/fonts.css` and the five woff2 files, byte-identical to the Mini
  Games, Bingo Royale and website copies, with the licence note in `fonts/README.md`. Closed by
  PR #3 and v0.2.0.
- **3. Call-view slot** (2026-11-20, DECISIONS K6). The website fixed the placement and the sizes
  (GAME-INTEGRATION §9, decided 2026-11-20). The kit reserves exactly those: `css/call.css`
  (`sk-call-slot`) and `callSlot`, hidden while no call is linked, plus the typed
  `seasonal-call` link. Framing the view itself is item 8. Closed by PR #6 and v0.3.0.
- **4. Server sign-in and 2FA** (2026-11-21, DECISIONS K5). One reviewed merge of Bingo's and
  Mini Games' website sign-in, identity, two-factor and TOTP code, plus what only one had:
  `@seasonal/kit/server`. Each game's visible behaviour is a per-game option: the steps rule,
  the recovery-code style, how `guest` and `invalid` are answered. Tested at 100 %. Three
  independent reviews ran; every confirmed finding is fixed, and the last was clean. A security
  pass is recorded (docs/security-pass.md). Closed by PR #13 and v0.8.0.
- **10. Mini Games' bar and fit needs** (2026-11-23). A `prefs` icon in `GameBar`'s
  `BarIconName` (O117), and `watchFit` / `useFitScale` fitting again once web fonts have loaded
  (T404). Closed by PR #31 and v0.12.0.
- **18. Header order: the theme toggle stays last** (Bingo's wish, 2026-11-23: its `header.css`
  re-orders back link, brand, navigation, toggle, account). Decided K43: the kit keeps the toggle
  last in the row, there is no configurable order, and Bingo aligns to the kit later. Closed as
  decided; nothing to build.
- **2a. The host side of the chat embed** (BACKLOG 2, 2026-11-24). Seasonal Bingo Royale
  `master` `3a00729` frames the website chat with the kit's `WebsiteChatFrame`
  (`apps/web/src/shell/ChatDock.tsx`, import at line 21, use at line 140), which links the frame
  with the kit's `connectChat`. Closed by that use; the sign-in helpers stay open in item 2.
- **9a. The chat frame's link as a React part** (BACKLOG 9, 2026-11-24). The same use of
  `WebsiteChatFrame` in Bingo's `master` (`3a00729`, `apps/web/src/shell/ChatDock.tsx`). The
  rest of item 9 stays open.
- **15. The header folds always below a given width** (Bingo's wish of 2026-11-23, K40).
  `AppHeader`'s `foldBelow`, on top of the measured fold, opt-in. Closed by v0.13.0.
- **16. A default for `--sk-floor-text` outside `fit.css`** (Bingo's wish, K41). A zero-
  specificity default of 14 px in `tokens.css`; `fit.css` still wins. Closed by v0.13.0.
- **8. The call view in the slot** (DECISIONS K6, K44). The website serves `/embed/call/<id>`
  (website `master` e11b3eb). The kit builds its address, frames it only with a call id
  (`allow="autoplay; fullscreen"`, nothing more) and follows it (`resize`, `ended`), and its
  message layer was checked against the website's own sender on 2026-11-24: nothing differed.
  Closed by v0.13.0. No game passes a call id yet.
- **11. The token names take the prefix** (the race's adoption plan, 2026-11-22). All 49 custom
  properties of `css/tokens.css` are `--sk-` prefixed, every use in the kit follows,
  tests/prefix.test.ts checks custom properties too (only `--fit`, which a game's element carries,
  is left), and the CHANGELOG has the old and new name of each. Closed by PR #37 and v0.14.0, which
  breaks every game (DECISIONS K45) and was released after the owner's review.
- **12. A middle part in `ResultFrame`** (Mini Games T417, 2026-11-23). `ResultFrame`'s optional
  `middle` slot: a card of its own between the first part and "more", fixed in the fitting, for
  Mini Games' "Closest to winning". Chosen from [concepts/result-frame.md](concepts/result-frame.md)
  (point 2). Closed by PR #39 and v0.15.0.
- **17. A one-column `ResultFrame`, or two cards only with a reveal** (Bingo's wish, 2026-11-23,
  K42). A null or missing `reveal` renders no reveal box and sets `data-sk-reveal="none"`, on
  which `css/frames.css` lays the first part out in one column
  ([concepts/result-frame.md](concepts/result-frame.md) point 1). Closed by PR #39 and v0.15.0.
- **13. The dock bar's padding and field** (Mini Games T416 (3), 2026-11-23). Measured, no kit
  change ([concepts/dock-bar.md](concepts/dock-bar.md)): the 4 px padding is 8 px of the row and
  at most 2 % of the window, and the kit's field was visible in every measurement. Mini Games
  measures again in the real game and reports back; a new item then. Closed by PR #39 and v0.15.0
  without a change.
- **20. A merged single-card `ResultFrame` option** (the concept's point 4, Bingo, 2026-11-24).
  Decided no, K47 (replaced by K93, 2026-11-26: the frame has a `dense` variant). Bingo drops its own `results.css`
  overrides at its next kit adoption. Nothing to build.
- **21. The start card fits again after web fonts load** (Mini Games T404 and T423, decided
  2026-11-24, K48). `StartCard`'s optional `fit` prop passes `FitOptions` (`afterFonts`) to
  `useFitScale`. Closed by PR #41 and v0.16.0.
- **19. The website keeps its own sign-in brake** (2026-11-24, K49). Decided: it does not move to
  `FailureBrake`; nothing to build. Closed as decided.
- **22. The open phone sheet is capped by the visible height** (Mini Games on Chrome Android, large
  system font, 2026-11-24, K50). `css/dock.css` caps its height by `--sk-visible-height` minus the
  dock, its margin and the gap; the head and the bar stay visible, the messages scroll inside.
  `showcase/sheet.spec.ts` measures it at 375 × 667 and 390 × 844 with a 200 % root font. A real
  keyboard is not emulated. Closed by PR #44 and v0.17.0.
- **23. The handbook follows v0.12.0 to v0.17.0** (2026-11-24, K51, K52, K53, K54). `docs/HANDBOOK.md` has
  the new kit parts, "How a Seasonal game looks", "Before production", the working-cheaply rules,
  HSTS and `FailureBrake`; every release now updates it. Closed by PR #46.
- **24. The result frame fits again after web fonts load** (Mini Games T423, decided 2026-11-24,
  K55). `ResultFrame`'s optional `fit` prop passes `FitOptions` (`afterFonts`) to `useFitScale`.
  Closed by PR #47 and v0.18.0.
- **25. Step badges in the header** (Seasonal Cases, decided 2026-11-24, K56). `HeaderAccount.steps`
  takes the member's steps in the kit's `Step` shape; the header draws them as small icons beside
  the name, in the chip and the folded menu, only for the website's own icon addresses. Closed by
  PR #49 and v0.19.0.
- **2b. The sign-in helpers, client side** (BACKLOG 2, 2026-11-25). Seasonal Mini Games `master`
  `1988346` uses `websiteSignInHref` (`apps/web/src/account/SignIn.tsx` line 17) and
  `signInAgainAfter` (`apps/admin/src/http.ts` line 24). Closed by that use.
- **9b. The dock's arrivals and `DockedScreen`** (BACKLOG 9, 2026-11-25). Mini Games `1988346` uses
  `useDockArrivals`, `useDockSight` and `useDockView` (`apps/web/src/chat/ChatRoom.tsx` line 26) and
  `DockedScreen` (`apps/web/src/match/DockedMatch.tsx` line 28). Closed by that use; `ChatDock`
  and the call slot stay in item 9.
- **26. The owner's word on the night audit's proposals** (2026-11-25, K58, K59). A-01, A-02, A-17 and
  A-29 are built: the font's copyright holder is in `fonts/README.md`, `BarAction` takes `controls`, the
  call frame has `referrerPolicy="strict-origin"`, `package.json` has `sideEffects`. A-03 is declined and
  A-05 stays as it is. Closed by v0.20.0.
- **27. Shared client parts and test tools** (2026-11-26, K66 to K70 and K73 to K76). The
  comparison's parts are built and released: v0.23.0 (PR #61), v0.24.0 (PR #63), v0.25.0 (PR #65)
  and v0.26.0 (PR #67). The shared call slot (draft PR #68) and the base components (draft PR #70)
  wait for review; what was only compared is item 29.
- **31. The header fold depended on history** (Seasonal Cases on v0.22.0, 2026-11-25, K79): folded
  after a fresh load at 1536 px, unfolded after a resize to it. Closed in v0.27.0
  (`src/react/useHeaderFold.ts`, `headerFold.test.tsx`, `showcase/cases.spec.ts`).
- **32. The backup units named a path in the pnpm store** (Seasonal Cases, 2026-11-25): it changes
  with every kit update. Closed in v0.27.0 (`ops/backup.sh`, `print_units`,
  `ops/test/backup-units.test.sh`).
- **33. The Menu button showed when `bar.css` came after `header.css`** (Seasonal Cases,
  2026-11-25). Closed in v0.27.0 (`css/header.css`, `showcase/layout.spec.ts`).
- **34. A docked screen's scrolling content had no keyboard access** (Seasonal Cases, result page,
  2026-11-25). Closed in v0.27.0 (`DockedScreen`, `dockless.test.tsx`, `showcase/layout.spec.ts`).
- **35. The plain-http session cookie ignored `basePath`** (Seasonal Cases, 2026-11-25). Closed in
  v0.27.0 (`src/server/sessionCookie.ts` and its test).
- **36. The operations doc did not say that `backup` needs Linux** (Seasonal Cases, 2026-11-25).
  Closed in v0.27.0 (OPERATIONS.md).
- **37. ADOPTION.md said Cases had no outward fetch** (2026-11-25). Closed in v0.27.0.
- **38. A game copied from Cases would run CI twice per push** (2026-11-25, K80). Closed in v0.27.0
  (HANDBOOK; the two games' own files are theirs to change).
- **39. ADOPTION.md said Mini Games' old backups stay readable** (Mini Games, 2026-11-25).
  Closed in v0.27.0.
- **40. The security headers had no `script-src-attr` and no upgrade of http requests** (Mini
  Games, 2026-11-25). Closed in v0.27.0 (`securityHeaderSet`, its test).
- **41. The game bar indented twice inside a page with a gutter** (Mini Games, 2026-11-25).
  Closed in v0.27.0 (`--sk-bar-gutter`, `showcase/layout.spec.ts`).
- **42. No way to call a configured local address through the guarded fetch** (Mini Games,
  2026-11-25). Closed in v0.27.0 (`localOrigins`, `guardedFetch.test.ts`).
- **43. `writeCheck` had no named cross-origin write** (Mini Games, 2026-11-25). Closed in
  v0.27.0 (`crossOrigin`, `writeCheck.test.ts`).
- **44. `frames` took origins only** (Mini Games, 2026-11-25). Closed in v0.27.0
  (`securityHeaderSet`, its test).
- **45. Whether a website-mode game may be framed elsewhere** (Mini Games, 2026-11-25). Decided
  no (K81); nothing to build.
- **46. A pooled socket could skip the guarded fetch’s address check** (security pass before
  v0.27.0). Closed in v0.27.0 (`agent: false`, `guardedFetch.test.ts`).
- **29. The socket client and the season icons** (compared 2026-11-26; decided 2026-11-25, K83).
  The season icons ship in the kit (`seasons/`, `SeasonIcon`, the daily comparison). The socket
  client is not built. Closed in v0.28.0.
- **30. The header's brand link was under 44 px** (found by the sweep, 2026-11-26; decided
  2026-11-25, K84). Closed in v0.28.0 (`css/header.css`, `showcase/testing.spec.ts`, which no
  longer accepts the finding).
- **47. The account chip showed "Signed in asOlga" above 1440 px** (Seasonal Cases, 2026-11-25).
  Closed in v0.28.0 (`AppHeader`, `showcase/steps.spec.ts`).
- **48. The docs let an installer copy `ops/backup.sh` alone** (Seasonal Cases, 2026-11-25): it
  loads `ops/lib/`. Closed in v0.28.0 (OPERATIONS.md, ADOPTION.md).
- **50. A restore refused a differing secret only after replacing the database** (Bingo Royale,
  2026-11-26). Closed in v0.33.0 (`ops/lib/backup-restore.sh`, `ops/test/backup.test.sh`, K91).
- **51. The failure brake read its rule once and let parallel guesses through** (Bingo Royale,
  2026-11-26). Closed in v0.33.0 (`failureBrake.ts` and its test, K92).
- **52. The result frame showed fewer places than Bingo's panel and clipped descenders** (Bingo
  Royale, 2026-11-26). Closed in v0.33.0 (`dense`, K93; the headline's line height;
  `showcase/looks.spec.ts`).
- **53. A full header folded for its badges, the folded toggle left the Menu's row and the chat
  bar's text did not grow** (Bingo Royale, 2026-11-26). Closed in v0.33.0 (K94,
  `showcase/looks.spec.ts`, `showcase/cases.spec.ts`).
- **54. ADOPTION.md's Bingo section was behind Bingo's master** (2026-11-26). Closed in v0.33.0.
- **28. Base components: the owner's look review** (2026-11-26, K78). Taken as proposed (K95).
  Closed in v0.34.0 (`css/components.css`, `showcase/components.spec.ts`).
- **55. Bingo Royale's three header wishes** (2026-11-26). Closed in v0.34.0 (K96,
  `css/header-account.css`, `css/header.css`, `showcase/looks.spec.ts`).
- **56. A fresh install's owner role could create no temporary table** (Mini Games, 2026-11-26).
  Closed in v0.34.0 (`ops/lib/db-roles.sql`, `tests/db-roles.integration.test.ts`, K97).
- **57. The admin restore could not restore secret files** (Mini Games, 2026-11-26). Closed in
  v0.34.0 (`ops/lib/admin.sh`, `ops/test/admin.test.sh`, K98).
- **58. `SeasonIcon` took pixels only and had no one-colour form** (Mini Games, 2026-11-26).
  Closed in v0.34.0 (K99).
- **59. No way to send a request again after a step-up** (Mini Games, 2026-11-26). Closed in
  v0.34.0 (K100).
- **60. No plain-http frame source with a path in development** (Mini Games, 2026-11-26). Closed
  in v0.34.0 (K101).
- **61. The contrast guard read no `var()` or `color-mix()`** (Mini Games, 2026-11-26). Closed in
  v0.34.0 (K102).
- **62. The stand-in website accepted the proxy's secret** (Mini Games, 2026-11-26). Closed in
  v0.34.0 (K103).
- **63. The stand-in's step icon showed as a blank square** (Seasonal Cases, 2026-11-26). Closed
  in v0.35.0 (`websiteStandIn.ts` and its test).
- **64. The route file named no trusted range and gave no reason for refusing metrics** (Seasonal
  Cases, 2026-11-26). Closed in v0.35.0 (`website-route.sh`, `website-route.test.sh`). The four
  cookie removals stay: none is redundant (each takes one pair).
- **65. A running Vite kept the old kit after a pin move** (Seasonal Cases, 2026-11-26). Closed in
  v0.35.0 (ADOPTION.md, HANDBOOK.md).
- **66. Large text cut, hid or pushed content away** (Cases 77, Mini Games, 2026-11-26): the game
  bar, the start card, the result headline, the chat sheet and the panel's padding. Closed in
  v0.36.0 (`bar.css`, `frames-start.css`, `frames.css`, `dock.css`, `components.css`,
  `showcase/large.spec.ts`).
- **67. A website organiser's header folded at 1536 px** (Cases 79, 2026-11-26). Closed in v0.36.0
  (`header-account.css`, `showcase/looks.spec.ts`, K111).
- **68. The docked screen was a landmark around the game's main** (Cases 78) **and dense lists had
  no 24 px rule** (Bingo, 2026-11-27). Closed in v0.36.0 (`DockedScreen.tsx`, `components.css`,
  `probeRules.ts`, K112).
- **69. Gaps of the sweep, the probe and the stand-in** (Mini Games, Cases, Bingo, 2026-11-27):
  open failures, edges and overlaps, the kit's ellipses, running animations, axe's exclude, three
  stand-in options. Closed in v0.36.0 (`sweep.ts`, `probe*.ts`, `websiteStandIn.ts`). A login
  page of the stand-in's own is declined.
- **70. Rollback, a failed restore and a status that wrote** (Bingo, 2026-11-27). Closed in
  v0.36.0 (`admin.sh`, `admin-update.sh`, `backup-restore.sh`, `admin.test.sh`).
- **71. `Attempt` was not exported, and four docs were wrong or silent** (all three games,
  2026-11-27). Closed in v0.36.0 (`server/index.ts`, ADOPTION.md, OPERATIONS.md, CHANGELOG.md).
- **49. Shared ops parts for every game** (owner, 2026-11-26). a to e released in v0.29.0 to
  v0.32.0; g, h and j in v0.35.0 (K109, K108, K107); i, k and f decided (K104 to K106).
