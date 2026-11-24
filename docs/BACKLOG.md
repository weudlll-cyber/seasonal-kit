# Backlog

Part one is what is open, each item with what "done" means. Part two is what is closed, each item
with what closed it. A closed item moves from part one to part two in the same commit that closes
it, and keeps its number. [OPEN.md](OPEN.md) is the short page over part one.

## Part one — open

Each item keeps its number for good, so the lists are bullets with the number in bold: a
numbered Markdown list would be renumbered by the formatter once an item closes.

- **2. Sign-in helpers, client side.** The website sign-in route helpers (Mini Games
  `packages/ui/src/websiteSignIn.ts`: `websiteSignInHref`, `signInAgain`, `signInAgainAfter`).
  Done when: a game uses them. They are in the kit since v0.3.0 with tests. No game's `master`
  uses them yet (checked 2026-11-24: Bingo Royale `3a00729`, Seasonal Cases `073f9ad`; Mini
  Games `721761f` and Seasonal Party `a09f803` pin no kit). The host side of the chat embed,
  the other half of this item, is closed (part two, 2a).
- **5. Adopt the kit in the games:** Mini Games first, then Bingo Royale, then Seasonal Party,
  each in its own PR with the owner's approval, following the CHANGELOG's migration notes. Done
  when: each game pins a kit tag and has removed its own copies of the moved parts. The plan per
  game, with paths, order, risks and tests, is [ADOPTION.md](ADOPTION.md) (2026-11-21).
- **9. React wrappers.** What is left of it: the dock's arrivals (`useDockArrivals`, Mini Games'
  `ChatArrivals`, `HostChatSight`), `ChatDock`, `DockedScreen` and the call slot. In the kit since
  v0.4.0 with tests. Done when: a game uses them. Checked 2026-11-24: Seasonal Cases `073f9ad`
  uses `useDockReserve` and `useFitScale` only (`apps/web/src/board/RegistrationBoard.tsx` line
  12, `apps/web/src/stage/Stage.tsx` line 18); Bingo's `master` has its own `ChatDock` around the
  kit's frame. The chat frame's link is closed (part two, 9a).
- **14. Framing a host chat from another https origin** (Mini Games T412). Deferred (decided
  2026-11-23): not built, and not planned for a release until the owner takes it up. Today
  `OriginChatFrame` is local development only (K32). Done when: the owner takes it up, and the
  kit has it with a test and a security pass.

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
  Decided no, K47: Bingo shows its result like the other games and drops its own `results.css`
  overrides at its next kit adoption. Nothing to build.
- **21. The start card fits again after web fonts load** (Mini Games T404 and T423, decided
  2026-11-24, K48). `StartCard`'s optional `fit` prop passes `FitOptions` (`afterFonts`) to
  `useFitScale`. Closed by PR #41 and v0.16.0.
- **19. The website keeps its own sign-in brake** (2026-11-24, K49). Decided: it does not move to
  `FailureBrake`; nothing to build. Closed as decided.
