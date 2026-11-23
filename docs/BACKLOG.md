# Backlog

Part one is what is open, each item with what "done" means. Part two is what is closed, each item
with what closed it. A closed item moves from part one to part two in the same commit that closes
it, and keeps its number. [OPEN.md](OPEN.md) is the short page over part one.

## Part one — open

Each item keeps its number for good, so the lists are bullets with the number in bold: a
numbered Markdown list would be renumbered by the formatter once an item closes.

- **2. Sign-in helpers and the chat embed, client side.** The website sign-in route helpers
  (Mini Games `packages/ui/src/websiteSignIn.ts`), and the host side of the website chat's embed
  protocol (website `docs/EMBED.md`). Done when: both are in the kit with tests, and a game uses
  them. The kit's part is in v0.3.0 (`websiteSignIn`, `chatEmbed`, `chatArrivals`). Bingo
  Royale's `master` (3a00729, pinning v0.11.1) uses the chat frame (`WebsiteChatFrame`); no game
  on `master` uses the sign-in route helpers yet. The item stays open until one does (item 5).
- **5. Adopt the kit in the games:** Mini Games first, then Bingo Royale, then Seasonal Party,
  each in its own PR with the owner's approval, following the CHANGELOG's migration notes. Done
  when: each game pins a kit tag and has removed its own copies of the moved parts. The plan per
  game, with paths, order, risks and tests, is [ADOPTION.md](ADOPTION.md) (2026-11-21).
- **8. The call view in the slot** (DECISIONS K6). Frame the website's `/embed/call/<id>` page
  in the slot (`allow="autoplay; fullscreen"`, nothing more) once a game passes a call id. The
  site serves the page now (website `master` e11b3eb, GAME-INTEGRATION §9 "Built"). Done when:
  the kit builds its address and frames it only with a call id, and the kit's message layer
  (`connectCall`, v0.3.0) has been checked against the site's real messages.
- **9. React wrappers.** The hooks and components the games build on the kit's framework-free
  parts: the chat frame's link and its arrivals (Mini Games' `useHostChatFrame`, `ChatArrivals`,
  `HostChatSight`), and the call slot. Left for a later step by the owner's brief for v0.3.0.
  Done when: they are in the kit with tests, and a game uses them. The kit's part is in v0.4.0
  (`WebsiteChatFrame`, `ChatDock`, `DockedScreen`, `useDockArrivals`); open until a game uses
  them (item 5).
- **11. The token names take the prefix** (the race's adoption plan, 2026-11-22, its third
  point). `css/tokens.css` defines its 49 custom properties without the `sk-` prefix
  (`--color-text`, `--space-2`, `--gutter`, …), so they can clash with a game's own. Every game
  reads them, so renaming them breaks every game: it goes into the next minor, not into v0.11.1.
  Done when: each shared token is `--sk-` prefixed, tests/prefix.test.ts checks custom
  properties too, and the CHANGELOG has a migration note per game with the old and the new
  name.

- **12. A middle part in `ResultFrame`** between the first part and "more" (Mini Games T417,
  2026-11-23). Not in v0.12.0. To be decided after the idea is checked against Bingo's and
  Cases' results, since a frame every game shares must fit all three. Done when: the owner
  decides, and what is decided is in the kit with a test, or is recorded as not wanted.
- **13. The dock bar's padding and field** (Mini Games T416 (3), 2026-11-23). Not in v0.12.0:
  the 4 px padding of `.sk-chat-dock-row` in the bar's form `line`, and the writing field that
  is hidden in the form `field`. Both would change what every game sees, so they are measured
  first (padding in the three games' phone layouts, the field with a game's own field passed).
  Done when: the measurement is recorded here and the owner decides.
- **14. Framing a host chat from another https origin** (Mini Games T412). Deferred (decided
  2026-11-23): not built, and not planned for a release until the owner takes it up. Today
  `OriginChatFrame` is local development only (K32). Done when: the owner takes it up, and the
  kit has it with a test and a security pass.

- **15. The header folds always below a given width** (Bingo's wish of 2026-11-23, its
  `apps/web/src/shell/header.css` lines 129–132: always folded below 960 px). An `AppHeader`
  option, on top of the measured fold. Planned for v0.13.0 (DECISIONS K40). Done when: it is in
  the kit with a test, opt-in.
- **16. A default for `--sk-floor-text` outside `fit.css`** (Bingo's wish, same file: it loads
  no `fit.css`, so the header's floor is unset). A default in `tokens.css`, planned for v0.13.0
  (K41). Done when: header, bar and dock have a floor without `fit.css`, and `fit.css` still
  wins where it is loaded.
- **17. A one-column `ResultFrame`, or two cards only with a reveal** (Bingo's wish,
  `css/frames.css` line 229, the 900 px two-column rule). To be decided together with item 12
  after checking both against Bingo, Mini Games and Cases (K42). Done when: decided, and what
  is decided is in the kit with a test.

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
