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
  them. The kit's part is in v0.3.0 (`websiteSignIn`, `chatEmbed`, `chatArrivals`). The item
  stays open until a game uses them (item 5).
- **4. Server sign-in and 2FA** (DECISIONS K5). One reviewed merge of Bingo's and Mini Games'
  `websiteSignIn`, `websiteIdentity`, `twoFactor` and `totp`. Done when: the kit holds the more
  complete version plus what only the other has, reviewed and tested, and a security pass is
  recorded.
- **5. Adopt the kit in the games:** Mini Games first, then Bingo Royale, then Seasonal Party,
  each in its own PR with the owner's approval, following the CHANGELOG's migration notes. Done
  when: each game pins a kit tag and has removed its own copies of the moved parts.
- **8. The call view in the slot** (DECISIONS K6). Frame the website's `/embed/call/<id>` page
  in the slot (`allow="autoplay; fullscreen"`, nothing more) once a game passes a call id. It
  waits for the site: GAME-INTEGRATION §9 says the page is not built yet and that a game frames
  nothing in the slot until it is. Done when: the site serves the page, the kit builds its
  address and frames it only with a call id, and the kit's message layer (`connectCall`,
  v0.3.0) has been checked against the site's real messages.
- **9. React wrappers.** The hooks and components the games build on the kit's framework-free
  parts: the chat frame's link and its arrivals (Mini Games' `useHostChatFrame`, `ChatArrivals`,
  `HostChatSight`), and the call slot. Left for a later step by the owner's brief for v0.3.0.
  Done when: they are in the kit with tests, and a game uses them. The kit's part is in v0.4.0
  (`WebsiteChatFrame`, `ChatDock`, `DockedScreen`, `useDockArrivals`); open until a game uses
  them (item 5).

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
