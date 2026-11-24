# Decisions

The owner's decisions that govern the kit, as dated facts. Only the owner makes them; a change to
one is a new dated entry here, in the same commit as the work it governs ([CLAUDE.md](../CLAUDE.md)).

## 2026-11-20

- **K1 — One kit for all games.** There is one shared kit for every Seasonal game. It is its own
  public GitHub repository, `weudlll-cyber/seasonal-kit`, with the package name `@seasonal/kit`.
  Each game consumes it as a git dependency pinned to a version tag. A game moves to a new kit
  version only with the owner's approval.
- **K2 — A stricter standard.** The kit is held to a stricter standard than any single game in
  security, hygiene, docs and tests, because every game depends on it.
- **K3 — The website owns the season colours.** The website (`seasonal-entertainment`) stays the
  single source of the season colours: `client/src/styles/tokens.css`, lines 16–19 on its
  master. The kit copies them. Its CI fails when the copy differs from the site's master.
- **K4 — Seasonal Party's frame comes from the kit.** Seasonal Party keeps its island look and its
  round font only inside the play field. The frame around it comes from the kit: bars, chat,
  start card, result page and fonts. Its season colours are the website's.
- **K5 — Server sign-in and 2FA later.** Server sign-in and 2FA go into the kit later, as their
  own carefully reviewed step. That step takes the more complete of the Bingo and Mini Games
  versions, plus whatever only the other has.
- **K6 — A reserved call-view slot.** The layout reserves a slot for a later call view. Building
  it is a later step: the website is finalising the call view's placement and size now.
- **K7 — The `sk-` prefix.** Shared CSS classes and keyframes use the prefix `sk-`. It replaces
  `sbr-` and `smg-` in shared parts only; a game's own parts keep its prefix.
- **K8 — The Luxora Grotesk font ships in the kit.** The Seasonal Tokens project bought the
  font. It may be used and shipped in the kit. It is not covered by the kit's AGPL licence
  (licence note: [fonts/README.md](../fonts/README.md)). This closes kit BACKLOG 7.
- **K9 — All five Luxora weights.** The owner confirmed that `css/fonts.css` declares all five
  Luxora Grotesk faces: Book 400, Regular 500, Bold 700, Italic 400 and Light Italic 300.
- **K10 — The first security pass.** The owner confirmed the security pass in PR #3
  ([security-pass.md](security-pass.md)) as the one that closes BACKLOG 6.
- **K11 — The licence stays.** The owner confirmed that `package.json` keeps the licence
  `AGPL-3.0-or-later`. The font exception is stated in [fonts/README.md](../fonts/README.md),
  [README.md](../README.md) and [SECURITY.md](../SECURITY.md).
- **K12 — PR #4.** The owner confirmed PR #4 (the v0.2.0 delivery proof, docs only), which the
  owner merged without a review, before master was protected.
- **K13 — Master is protected.** Since 2026-11-20, `master` has branch protection. The required
  checks are `verify`, `osv-scanner`, `gitleaks`, `docs` and `analyze` (CodeQL), each one reported
  by GitHub Actions, and the branch must be up to date. Every change goes through a pull request,
  with 0 required approvals: the owner approves and merges. Unresolved conversations block a
  merge. The rules apply to admins too. Force pushes and deletion of the branch are not allowed.
  Since 2026-11-21 `showcase` is the sixth required check (K19).

## 2026-11-21

- **K14 — The fit floor is per game.** Seasonal Mini Games keeps 13 px body text, with its O111
  floors: 24 px display values, 22 px rows and 40 px phone touch targets. Seasonal Bingo
  Royale keeps 14 px. The kit never lets a game's floor go below what that game has today, and a
  test enforces it (`tests/fit-floors.test.ts`).
- **K15 — The unattended chain of 2026-11-21 is approved as written.** That includes merging
  each piece's PR once every required check is green, and cutting its tag. No game repository
  is changed: adopting the kit in a game needs the owner.
- **K16 — Screenshots are not committed and do not pile up.** The showcase's screens stay local
  in a git-ignored folder, and each run deletes the previous run's ([SHOWCASE.md](SHOWCASE.md)).
- **K17 — Every game sandboxes the website chat frame (D1).** The chat frame always carries
  `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`. The kit's
  `WebsiteChatFrame` has no option to turn it off (v0.9.0).
- **K18 — Bingo moves to the docked layout, after a sweep (D2).** Seasonal Bingo Royale moves to
  the docked chat strip, the start card and the game bar with focus mode. Before the owner
  tests it, a check at the sweep sizes must pass: desktop 1280×720, 1366×768, 1536×768,
  1440×900, 1900×860 and 1920×1080; phone 375×667, 360×780, 390×844 and 430×932; each in light
  and dark ([ADOPTION.md](ADOPTION.md)).
- **K19 — `showcase` is a required check (D3).** The showcase's Playwright and axe run is the
  sixth required check on `master` (K13).
- **K20 — Recovery codes are HMAC-SHA-256 with a server key (D4).** A game passes the key; it is
  never in a repository. A legacy SHA-256 hash still verifies, and both are compared in
  constant time (v0.9.0).
- **K21 — Bingo's header becomes the shared header (D5).** The app header that Seasonal Bingo
  Royale's test server shows is the kit's `AppHeader` for every game (v0.9.0).
- **K22 — Non-ASCII usernames are handled correctly (D6).** The kit decodes the website's
  identity headers as the website encodes them. A name it cannot decode gives no identity,
  never a garbled name (v0.9.0).
- **K23 — A full audit after v0.9.0 (D7).** A full audit of the kit follows v0.9.0, with one
  independent reviewer per area. The night chain of 2026-11-21/22 that runs it is approved as
  written, merges and tags included.

## 2026-11-22

- **K24 — The repository's GitHub settings.** The settings proposed by the audit of 2026-11-22
  are applied: merge commits only, the branch deleted after a merge, `v*` tags that can be
  neither moved nor deleted, vulnerability alerts on, no wiki and no Projects, actions pinned to
  commit SHAs. There is no CODEOWNERS file. The settings as read back are in
  [RELEASING.md](RELEASING.md).
- **K25 — Planning moved to the Seasonal Entertainment planning chat.** Since 2026-11-21 the kit
  is planned there; its decisions are recorded here as before ([CLAUDE.md](../CLAUDE.md)).
- **K26 — The font question of the audit is closed.** The Luxora Grotesk files stay in the kit
  as they are; K8 and K9 are unchanged (audit 2026-11-22, B8).
- **K27 — Legacy recovery codes keep working.** Recovery codes stored as plain SHA-256 stay
  valid with no end date, and no game sets a deadline for them (K20 keeps them verifying).
- **K28 — Seasonal Cases takes v0.10.0.** Seasonal Cases moves to the kit's v0.10.0 once it is
  released ([ADOPTION.md](ADOPTION.md)); its repository is not touched from here.
- **K29 — Keyboard, focus and API fixes go into v0.10.0.** The audit's keyboard and focus
  fixes (B7) and its API cleanup (B4) are both part of v0.10.0, before any game adopts the kit:
  the header menu closes when the focus leaves it and returns the focus after a page change;
  the tab order follows the order shown; one kit focus ring; the phone chat sheet takes and
  returns the focus; 44 px targets, the back link included; nothing scrolls sideways at 320 px;
  the header's background is contrast-checked. `connectCall` and `CALL_SLOT` stay exported:
  BACKLOG 8 needs them.
- **K30 — v0.10.1 is released unattended.** The owner approved (2026-11-22) merging and
  releasing v0.10.1 in the night without a morning look, because nothing in it is visible to
  players: once all six required checks are green, the release PR is merged, tagged and its
  delivery proven, and the delivery record's PR is merged once its checks are green.
- **K31 — Data attributes take the prefix too.** Every data attribute the kit sets or reads is
  `data-sk-` prefixed, as K7 has it for classes and keyframes; tests/prefix.test.ts checks both.
  `data-testid` (the testing library's) and `data-theme` (the website's) stay as they are
  (v0.10.1, audit 2026-11-22 "Noted, not changed").
- **K32 — The games' requests go into the kit.** The requests Bingo Royale (R1–R4), Seasonal
  Party and Seasonal Cases (20, 23, 24, 32, 36) made of the kit are built into it, in v0.11.0:
  the back link's space, the game bar on narrow phones, a header that folds when its items do
  not fit, a rate limiter whose rule can change at runtime, a result panel, the dock reserve
  without chat, the unread count on the bar's chat button, a bar toggle, and a local-only chat
  frame for another origin.
- **K33 — 24 px is the least pointer target in every game.** WCAG 2.5.8's 24 × 24 CSS px (or
  that much room around a target) is the minimum for every pointer target in every game; the
  phone touch-target floors of 40 px (Mini Games) and 44 px (the others) stay as they are. The
  kit holds it as `MIN_POINTER_TARGET` and `--sk-min-target`, and the showcase's axe run checks
  `target-size` (v0.11.0).
- **K34 — The season feed gets a kit reader.** The website's `GET /api/public/season` (version 1:
  `inSeason` and `halvingDays`) is read through one reader in the kit, `seasonFeedReader` in
  `/server`, server to server and with the game's own guarded fetch, instead of each game reading
  it its own way (v0.11.0).
- **K35 — A handbook for building a game lives in the kit.** How a Seasonal game is built (how
  we work, the repository and its kit pin, security, hygiene, tests, docs, the kit parts every
  game uses, and a short summary of embedding that links the website's own docs) is one
  document, [HANDBOOK.md](HANDBOOK.md), linked from the README. Each rule there names where it
  is enforced (v0.11.0).
- **K36 — v0.11.0 is released unattended.** The owner approved (2026-11-22) merging and
  releasing v0.11.0 in the night without a morning look: nothing changes for players until a
  game moves to it with the owner's word. Once all six required checks are green the release PR
  is merged, tagged and its delivery proven, and the delivery record's PR is merged once green.

## 2026-11-23

- **K37 — The peer dependencies are ranges.** `react` and `vite`, the kit's two optional peers,
  are caret ranges from the version the kit is tested with (`^19.3.1`, `^8.3.4`), not exact
  versions, so a game on a later minor or patch installs the kit with npm as with pnpm. The
  kit's own devDependencies stay exact and must meet the range. Renovate never bumps a peer on a
  minor, patch or pin; a new major widens the range (v0.11.1,
  [DELIVERY.md](DELIVERY.md), [RELEASING.md](RELEASING.md)).
- **K38 — Renovate never updates Node.** `engines.node` stays `>=22` and `.nvmrc` stays `22`;
  the two name the same major and change together, by hand, in a reviewed PR. Renovate's npm and
  nvm managers leave `node` alone (v0.11.1, [RELEASING.md](RELEASING.md)).
- **K39 — The back link has a place in `GameBar` for focus mode** (decided 2026-11-23). A game
  may pass `back` to its bar: the shell's back link (`BackLink`, reused) at the start of the row,
  arrow and words on a desktop, the arrow alone on a phone with the words as its name, so it
  fits beside the season pill. Without the prop the bar is unchanged (v0.12.0).
- **K40 — The header may always fold below a given width** (decided 2026-11-23, Bingo's wish,
  [BACKLOG.md](BACKLOG.md) 15). An opt-in `AppHeader` option, on top of the measured fold,
  planned for v0.13.0.
- **K41 — `--sk-floor-text` has a default outside `fit.css`** (decided 2026-11-23, Bingo's wish,
  BACKLOG 16). The kit's header, bar and dock get a text floor without loading `fit.css`; where
  it is loaded its values win. Planned for v0.13.0.
- **K42 — A one-column or reveal-only `ResultFrame` waits for the check** (decided 2026-11-23,
  Bingo's wish, BACKLOG 17). It is decided together with the middle part (BACKLOG 12), after
  both are checked against Bingo, Mini Games and Cases.
- **K43 — The theme toggle stays last in the header's row** (decided 2026-11-23, Bingo's wish,
  BACKLOG 18). The kit has no configurable order; Bingo aligns to the kit later.
- **K44 — The call view is framed in the slot, sandboxed like the chat** (decided 2026-11-24,
  v0.13.0, BACKLOG 8). With a call id the dock's slot frames the website's
  `/embed/call/<id>?theme=` and nothing otherwise. The frame allows `autoplay; fullscreen` and
  nothing more, and is sandboxed as the chat's frame is (K17) plus `allow-popups-to-escape-
sandbox`, so that "Open the call page" opens `/calls/<id>` as an ordinary page of the site in
  a new tab. The extra token is the one point beyond the chat's sandbox and is open to the
  owner's review.

## 2026-11-24

- **K45 — The shared tokens are `--sk-` prefixed** (v0.14.0, BACKLOG 11). All 49 custom
  properties of `css/tokens.css` take the prefix (`--color-text` is `--sk-color-text`), as K7 has
  it for classes and K31 for data attributes, so they cannot clash with a game's own. `--fit` is
  the one unprefixed property the CSS reads: a game's element carries it, set by `src/fit.ts`.
  The season colours keep the website's names on the website's side: the season check compares
  the kit's `--sk-color-spring` with the site's `--color-spring`. A break for every game, so it
  is released only after the owner's review.
- **K46 — Sign-in failures are braked with `FailureBrake` in every game** (decided 2026-11-24,
  v0.15.0; Seasonal Cases BACKLOG 49, its D51 and D55). `braked(key)` looks without counting,
  so a route refuses before the password check, and `failed(key)` counts one wrong password; a
  success is not counted. The rules and the keys (an account, an address range) stay in each
  game. Bingo moves its login limits onto it at its next kit adoption, and Cases replaces its own
  copy of the class with the kit's.
- **K47 — There is no merged single-card `ResultFrame` option** (decided 2026-11-24, v0.15.0;
  [concepts/result-frame.md](concepts/result-frame.md) point 4). Bingo shows its result like the
  other games, the first part and "more" as the kit lays them out, and at its next kit adoption
  drops its own `results.css` overrides of the kit's result classes.
- **K48 — `StartCard` passes the fit options through** (decided 2026-11-24, v0.16.0; Mini Games
  T404 and T423). One optional prop, `fit`, of the existing `FitOptions` type, goes to
  `useFitScale` as it is, so a game can ask the start card to fit again once web fonts have
  loaded (`afterFonts`). Without it the card is as before. Mini Games drops its own font-load
  counting on the start card at its next kit adoption.
- **K49 — The website keeps its own sign-in brake and does not move to `FailureBrake`** (decided
  2026-11-24; BACKLOG 19). `seasonal-entertainment` already counts only failed sign-ins and refuses
  before the password check (`server/src/http/rateLimit.js`, `skipSuccessfulRequests`; limits in
  `server/src/config.js`: 10 failures per address and 10 per username in 15 minutes), and it does
  not depend on the kit at all. Revisit if the website ever takes the kit.
- **K50 — The open phone sheet is never taller than the space visibly left above the bar** (decided
  2026-11-24, v0.17.0; Mini Games on Chrome Android with a large system font). `dvh` does not
  shrink for the on-screen keyboard and `rem` grows with the font, so the sheet's wished height
  (`min(60dvh, 30rem)`) is capped by `--sk-visible-height` minus the dock's own height, its margin
  and the gap (`css/dock.css`). The head with Close and the bar stay visible; the messages shrink
  and scroll inside. Without `DockedScreen` there is no such property and the wish decides as
  before. No game needs to change.
- **K51 — Every kit release updates `HANDBOOK.md`** (decided 2026-11-24). A release whose parts or
  rules change updates [HANDBOOK.md](HANDBOOK.md) in the same PR; [RELEASING.md](RELEASING.md)
  step 1 says so.
- **K52 — Every handbook rule names its check** (decided 2026-11-24). We work economically, but
  everything that can sensibly be proven by a test is. A row of the handbook names the test or
  CI job that holds its rule; where a test makes no sense, the row says why and that review
  checks it.
