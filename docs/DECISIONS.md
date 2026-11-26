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
- **K53 — Every game speaks English to its players** (decided 2026-11-24). Every text a player
  reads is English, in every game of the kit; the handbook says so.
- **K54 — Every game is licensed AGPL-3.0-or-later** (decided 2026-11-24). Each game's repository
  carries the AGPL's text in `LICENSE` and `"license": "AGPL-3.0-or-later"` in `package.json`, as the
  kit does; the Luxora Grotesk font stays outside it (K8). On 2026-11-24 the kit, Mini Games,
  Bingo Royale, Cases, Seasonal Party and the website all carry it (read from their `master`).
- **K55 — `ResultFrame` passes the fit options through** (decided 2026-11-24, v0.18.0; Mini Games
  T423). The same optional prop as `StartCard`'s (K48): `fit`, of the existing `FitOptions` type,
  goes to `useFitScale` as it is. Without it the frame is as before. Mini Games drops `useFontLoads`
  from the result frame's signature at its next kit adoption.
- **K56 — The header shows a member's step badges, in the kit's `Step` shape** (decided 2026-11-24,
  v0.19.0; Seasonal Cases: no game-side stand-in). `HeaderAccount` has an optional `steps`, a list
  of the `Step` the server's `identityFrom` already gives (`ladder`, `name`, `icon`); the shape and
  the one check of the icon address, "/media/step-icons/<32 hex>.webp", moved to `src/stepShape.ts`
  (no server code), which the server and the header both import, and the server entry exports
  the types unchanged. The chip draws at most three icons, 1.25rem square, each named by its
  step, only for an address that passes the check; any other address is dropped. Empty or
  missing: the header is as before.
- **K57 — The kit is held to the strictest standard of every Seasonal project** (decided
  2026-11-24). A deep audit ran in the night of 2026-11-24/25 ([AUDIT-2026-11-25.md](AUDIT-2026-11-25.md),
  [NIGHT-2026-11-25.md](NIGHT-2026-11-25.md)): what changes nothing a game sees is fixed with a test that
  fails first; what would change behaviour, a public name or a default is recorded with a proposal
  for the owner (BACKLOG 26), never changed. The result is released as v0.19.1.
- **K58 — The owner's answers on four proposals of the 2026-11-25 audit are built** (decided 2026-11-25,
  v0.20.0; A-01, A-02, A-17, A-29 of [AUDIT-2026-11-25.md](AUDIT-2026-11-25.md)). The copyright holder of
  the font files, read from their own name table, is recorded in `fonts/README.md` (Fontastica, 2021).
  A `BarAction` may carry `controls`, written as the button's `aria-controls`. The call frame has
  `referrerPolicy="strict-origin"`, as the chat frame has. `package.json` has
  `"sideEffects": ["**/*.css"]`, and the delivery proof shows that a consumer's bundle keeps the
  kit's CSS.
- **K59 — Two proposals of the audit are declined** (decided 2026-11-25). A-03: `useFitScale` and
  `watchFit` keep their positional arguments; an options object is considered when another option is
  needed. A-05: the local branch `worktree-agent-a459ae22b757ed187` and `.claude/worktrees/` stay
  untouched.
- **K60 — The kit's CSRF check refuses a write that names neither its origin nor its site** (decided
  2026-11-25, v0.21.0; Seasonal Cases' planning). A state-changing request (anything but GET, HEAD
  and OPTIONS) with no `Origin` and no `Sec-Fetch-Site` is refused. It also refuses one whose
  `Sec-Fetch-Site` is present and is neither `same-origin` nor `none`, and one whose `Origin` host is
  not the request's own host as the game sees it behind the website's proxy (a forwarded host is trusted
  only from the configured proxy). This covers what Cases' `sameSiteWrites` does (`app.ts:125-136`) and
  is stricter on the missing `Origin`.
- **K61 — The kit ships a backup and restore script** (decided 2026-11-25, v0.21.0; the night chain, from
  [concepts/shared-server-parts.md](concepts/shared-server-parts.md) section 1). `ops/backup.sh`,
  `ops/pull-backups.sh` and `ops/pull-backups.ps1` are in the package: Bingo Royale's rehearsed backup
  made to take its settings from `SK_BACKUP_*` variables, with Mini Games' restore drill. Encrypted with
  age to the operator's public key, 14 newest and 8 weekly kept, a restore that refuses another
  environment's backup, in one transaction. No secret, key or dump is printed. It runs only when a game
  runs it; no game changes until it adopts. Seasonal Cases has no backup today and takes this first
  ([OPERATIONS.md](OPERATIONS.md)).
- **K62 — The kit ships a guarded fetch** (decided 2026-11-26, v0.21.0; the night chain, from
  [concepts/shared-server-parts.md](concepts/shared-server-parts.md) section 2). `guardedFetch(options)`
  and `isPublicAddress` are in `@seasonal/kit/server`, from Mini Games' `safeFetch` and `safePost`:
  https only, every address the host resolves to must be public (IPv4 and IPv6, an IPv4-mapped one in
  its dotted or hex form judged as its IPv4), checked inside the socket's own lookup so a second,
  different DNS answer cannot pass, no redirects, a 5 s timeout over the whole exchange and a 64 KiB
  limit, both options. `seasonFeedReader` keeps taking a fetch from the game and documents this one.
  Found while generalising: Mini Games' mapped-address match sees only the dotted form, and the URL
  parser writes `[::ffff:127.0.0.1]` as `[::ffff:7f00:1]`, so a literal in that form passes there; the
  kit's check does not miss it (reported to the owner, Mini Games is read-only from here). No game
  changes until it adopts.
- **K63 — The kit ships the session cookie, the CSRF write check and the security header set**
  (decided 2026-11-26, v0.21.0; the night chain, from
  [concepts/shared-server-parts.md](concepts/shared-server-parts.md) sections 3 and 4). In
  `@seasonal/kit/server`, framework-free, no dependency: `sessionCookie` and `sessionCookieOptions`
  (Bingo's: `__Host-` or `__Secure-` name, `HttpOnly`, `SameSite=Lax`, `Max-Age` equal to the
  session's absolute length, so Mini Games' fixed 30 days is not copied); `writeCheck` (K60: Cases'
  `sameSiteWrites`, a write with neither `Origin` nor `Sec-Fetch-Site` refused, the forwarded host
  believed only from `trustedProxies`, the TCP peer, as the identity checks do); `securityHeaderSet`,
  `renderPolicy` and `securityHeadersHook` (Bingo's strict policy, Mini Games' configurable ancestors
  and admin rules; `script-src 'self'` always, `style-src 'self'` unless `inlineStyles`;
  `frame-ancestors` the game's own origin, which is the website's, in website mode, where an embed
  allowlist is refused; **no HSTS in any mode**: the website sends it in website mode, the TLS proxy
  standalone). A game's CSRF token stays and is a second layer. No game's headers or cookie change
  until it adopts.
- **K64 — The kit settles the health routes and ships the readiness answer** (decided 2026-11-26,
  v0.21.0; the night chain, from [concepts/shared-server-parts.md](concepts/shared-server-parts.md)
  section 5). `HEALTH_PATHS` is `/healthz` (liveness, `{ status: 'ok' }`) and `/readyz`: the names
  Bingo Royale and Mini Games already share and their installers probe. `readiness(probe, { timeoutMs,
extra })` gives 200 `{ status: 'ready' }` or 503 `{ status: 'unavailable', reason: 'database' }` with
  the error beside the body, never in it; Mini Games' website-feed field is `extra`. The per-address
  limit (Bingo's `openRouteLimit`) and the route registration stay in each game. Seasonal Cases' `/api/health`
  and `/api/ready` move to these names when it adopts, with its installer's probe.
- **K65 — The fixes from Seasonal Cases' measurements** (decided 2026-11-25 in Cases' planning,
  built 2026-11-26, v0.22.0). Cases' own CSS patches on its kit adoption (shell.css 195 and 204,
  moments.css 27-56, screens.css 41) move into the kit, each proved by a showcase measurement
  (`showcase/cases.spec.ts`):
  1. **The header's fold is right and nothing changes.** Cases' bar (back link, brand, six links, a
     member with three steps) folds at 1280 and 1536 px and unfolds from about 1700 px; opened by
     force it needs two rows at 1280 and 1536 px and one at 1920 px, so the kit never folds a bar
     that fits. Cases' brand rule changes no box there.
  2. **The folded brand keeps its longest word** (`min-width: min-content`, basis still 0): it no
     longer runs under the Menu button at 200 % font; the controls take a row of their own below
     it when they do not share one. Cases' `flex: 1 1 auto` is not taken: it put the toggle on a
     third row at 360 and 375 px at the default font. The back link's words may wrap on a phone:
     kept on one line they were 288 px wide at 200 % and pushed the whole header past a 360 px
     window.
  3. **The folded account chip** (24-character name, rank, three steps) was measured at 320 to
     390 px at 100 % and 200 %: it already wraps inside the menu panel (v0.19.1); the only fault
     at 200 % was the back link above, now fixed.
  4. **The game bar's facts wrap instead of ending in "…"** on a phone, never narrower than their
     widest word; the bar wraps its items so the buttons keep one row of their own; its inline
     padding is the gutter tokens' (the page's gutter on a desktop, 0.5rem on a phone, 0.25rem at
     400 px and under). Every game's bar changes look when it adopts.
  5. **`StartCard`'s `opensIn` is optional**: without it no countdown, as Cases needs (its shows
     have no start time); with it, as before (0 is a time).
- **K66 — The kit ships test tools in their own entry** (decided 2026-11-25 on
  [concepts/shared-client-parts.md](concepts/shared-client-parts.md) sections 1 to 3, built
  2026-11-26, v0.23.0). `@seasonal/kit/testing` is for a game's own Vitest and Playwright suites:
  sizes, the theme switch, screenshots of a look, and static guards (fixed colours, token contrast,
  text size). No other entry imports it, so it never reaches a game's bundle; it imports nothing at
  run time but Node's own modules. `@playwright/test` is an optional peer (`^1.64.1`, the oldest a
  game pins), used for types only (K37).
- **K67 — The fit probe and the sweep** (decided 2026-11-25 on section 2, built 2026-11-26, v0.23.0).
  `probe(page)` and `sweep(page, screens, { axe })` are in the testing entry: the default sizes are
  1920x1080, 1536x768, 1280x720, 390x844, 375x667, 360x780 and 320x568, root fonts 16 and 32 px, light
  and dark. A screen fails on sideways scroll, a box past the window, cut text, a control under 44 px
  (a link in running text exempt, a checkbox or radio measured by its label), or a fitted root that
  cuts a part. The game passes its own axe (`axeFinder(AxeBuilder)`, or `false` by name), so the kit
  depends on nothing new. A screen may name findings it accepts (`allow`). Bingo's text floor, card
  cells and overlap check, and Mini Games' pixel contrast, stay in the games.
- **K68 — Steps beside a name: one look in every game, the header's** (decided 2026-11-25 on
  [concepts/shared-client-parts.md](concepts/shared-client-parts.md) section 4, built 2026-11-26,
  v0.24.0). `StepBadges` (`@seasonal/kit/react`, `steps.css`) is the account chip's badges as a
  component for boards, player lists and lower thirds: the kit's `Step` shape, only an icon
  `isStepIcon` accepts, at most three, 1.25rem, named by the step. A step without a drawable icon is
  left out, as in the header, although Mini Games writes its name as text today.
- **K69 — A countdown runs on the server's clock** (decided 2026-11-25 on section 5, built
  2026-11-26, v0.24.0). `clockOffset` (main entry) measures the visitor's offset from answers that
  carry the server's time, the shortest round trip winning, and is null without a usable one;
  `useCountdown(at, offsetMs)` (React) counts the seconds to a server time and shows nothing until
  both are known, so a visitor's wrong clock is never trusted; `StartCard` takes `opensAt` (opt-in),
  `opensIn` unchanged. How a server time is asked for stays in each game (Mini Games' `time.sync`).
- **K70 — The client's API calls have one error shape** (decided 2026-11-25 on sections 6 and 7,
  built 2026-11-26, v0.24.0). The shape is Bingo Royale's and Mini Games', two of the three games:
  `ApiError(status, code, reason, body)`, with `ERROR` when the server names no code and status 0,
  `NO_ANSWER`, when there is no answer (Mini Games' hook already did that; Bingo's client let the
  fetch's own error through). Seasonal Cases' server answers a sentence in `error` instead of a code,
  so it maps at adoption; the kit does not carry its shape. `createApiClient` sends the CSRF token on
  writes and gives `onAnswer` every answer, so a game keeps its own rule for a lost session.
  `useApiGet` gives idle, loading, ready or failed with the whole error, tied to its path.
- **K71 — The backup script is split under the 300-line rule** (decided 2026-11-25, built
  2026-11-26, v0.25.0). `ops/backup.sh` is the entry (94 lines) and sources `ops/lib/backup-core.sh`
  and `ops/lib/backup-restore.sh`, which ship beside it: the same functions, commands and variables;
  the drill test passes unchanged. A game keeps calling `ops/backup.sh`.
- **K72 — The kit ships the installer's route-file step** (decided 2026-11-25 on
  [concepts/shared-server-parts.md](concepts/shared-server-parts.md) section 6, built 2026-11-26,
  v0.25.0). `ops/lib/website-route.sh` writes a game's own file into the website's routes folder
  (nginx `include …/routes/*.conf`, Caddy `import /etc/caddy/routes/*.caddy`), never a website
  file; the content is Mini Games' (from Bingo's), with the game's names and upstreams as
  `SK_ROUTE_*` variables, each checked so none can add a directive. The rest of the installer stays
  in the games.
- **K73 — The kit ships the load check's measuring helpers** (decided 2026-11-25 on section 8 of
  [concepts/shared-server-parts.md](concepts/shared-server-parts.md), "helper only", built
  2026-11-26, v0.25.0). `latencies`, `inBatches` and `watchServer` are in the testing entry:
  Bingo Royale's nearest-rank percentiles (Mini Games' rounded one rank up) and its metrics sampler
  with Mini Games' summary, the metric prefix a parameter. Scenarios, targets and sign-in stay in
  each game.
- **K74 — The kit ships a stand-in of the website for the games' browser tests** (decided
  2026-11-25 on [concepts/shared-client-parts.md](concepts/shared-client-parts.md) section 8, built
  2026-11-26, v0.26.0). `startWebsiteStandIn` in the testing entry is one local server that is the
  website and its proxy as the website's contract (master `cc743b9`) describes them: the authorize
  route, the proxy's sign-in rules (WebSockets too), the login hop, the season feed, the open-rounds
  check, step icons and the chat and call frames' messages. Contract tests judge it with the kit's
  own server and client checks. Where the website's document and code differ, the code decides (an
  open round's `kind` may be empty; the authorize route's origin rule is taken in its strict form).
  Databases, ports and nginx containers stay in the games; the account-changes feed is not in it.
- **K75 — A database URL's password goes to the clients through their environment** (decided
  2026-11-25, v0.26.0). `ops/backup.sh` takes a game's `DATABASE_URL` as `SK_BACKUP_DB_URL`, splits it
  into the address and the percent-decoded password, passes the password as `PGPASSWORD` and never on
  a command line; a `password=` in the query is refused.
- **K76 — Every Seasonal game runs in Docker on the server** (decided 2026-11-25), as the website,
  Bingo Royale and Mini Games do; Seasonal Cases moves to Docker before production. So the kit's
  backup stays as it is for the server side: the units `print-units` writes keep requiring
  `docker.service`, with no mode for a PostgreSQL installed as a system service and no extra choice of
  paths. Cases moves to Docker first, then takes the kit's backup unchanged.
- **K79 — The header's fold depends only on the width and the items** (2026-11-26, Seasonal Cases'
  finding on v0.22.0). Every decision measures the unfolded layout; a folded header is measured
  again on a new window width, a change of its own size (not by the fold itself) and loaded web
  fonts. Measured first, with a long organiser header in a throwaway page (Chromium on Windows, the
  faces under a name no system has): the first decision comes after the stylesheets apply (the
  header is `display: flex`) and before the fonts do (at 673 ms, no face loaded). There the header
  needed 1228 px in the fallback font and 1230 px in Luxora, so the font swap alone does not explain
  Cases' fold at 1536 px, which was not reproduced; it stayed because only a wider window unfolded.
- **K80 — One CI run per push** (2026-11-26). CI runs on push only for `master` and on pull
  requests against `master`; a work branch has a draft PR from its first push. Mini Games
  (`branches: ['**', '!shots/**']`) and Seasonal Cases (`branches: ['**']`) ran two identical runs
  per push; the kit, the website and Bingo Royale already follow the rule.
- **K81 — In website mode a game is framed by the website only** (confirmed 2026-11-25).
  `securityHeaderSet({ mode: 'website' })` refuses `ancestors`, as before. A game that must be framed
  elsewhere uses a standalone install with its `ancestors` list.
- **K82 — How every Seasonal project runs its checks** (decided 2026-11-25). Locally before each
  push the fast tests of the changed files and, when a browser spec checks what changed, that one
  spec file in one browser; the full checks on GitHub through the draft PR; no waiting for CI between
  pieces, one look at the end and before a merge; CI cancels a replaced run of a work branch; no
  re-run on an unchanged tree.
- **K83 — The season icons ship in the kit** (decided 2026-11-25, BACKLOG 29; the socket client
  stays out, as [concepts/shared-client-parts.md](concepts/shared-client-parts.md) section 14
  recommends). The website's four optimized files, byte for byte, compared with its `master` on
  every pull request and daily, as the season colours are. They belong to the Seasonal Tokens
  project and are not under the AGPL. A stylesheet draws them, so a bundler finds the files as it
  finds the fonts.
- **K84 — The header's brand link is a 44 px target** (decided 2026-11-25, BACKLOG 30; K29). Its box
  grows, the logo and the header's height do not: measured on the kit's headers at seven widths, the
  link went from 19–38 px to 44–46 px at 100 % text (55 px and more at 200 %), with every header as
  high as before.
- **K85 — One operator contact address per server** (decided 2026-11-25). Every Seasonal installer
  takes it from `/etc/seasonal/operator.env` (`SK_OPERATOR_EMAIL`, root's, mode 0644) through the
  kit's `sk_operator_email`; an explicit `--email` still wins and fills an empty file. No address is
  in the kit, in a game's repository or in a log beyond the installer's "using <address> from <file>".
- **K86 — Every game has a one-command install and an operator guide** (decided 2026-11-26):
  `ops/install.sh` (Ubuntu 24.04, Docker, standalone or inside the website, re-runnable, ending in a
  check through `/readyz`, using the kit's ops parts) and `docs/operator-guide.md` for an owner who
  is not technical, with fixed sections. Held by review and by the rehearsal before production
  ([HANDBOOK.md](HANDBOOK.md)).
- **K87 — One admin command's verbs in every game** (2026-11-26). `ops/lib/admin.sh`, from Bingo
  Royale's `sbr`, with update, confirm and rollback, and an uninstall of exactly one environment
  that asks for its name. The backups stay unless `--purge-backups` is given, because a backup cannot
  be made again; an unknown option of uninstall stops it.
- **K88 — A standalone install secures its host** (2026-11-26). The kit's `sk_host_baseline` turns
  on the firewall (SSH's real ports first, then 80 and 443), automatic security updates and a
  fail2ban SSH jail, only adding. It never changes the SSH configuration, only reports it, because a
  wrong change locks the owner out. In website mode it does nothing: the website's installer owns
  the host.
- **K89 — Every game's containers are hardened alike** (2026-11-26). App and database run with a
  read-only root, `no-new-privileges` and all capabilities dropped; the database adds back only
  CHOWN, DAC_OVERRIDE, SETGID and SETUID, measured on `postgres:17-alpine`. A game's own test holds
  its Compose file to it with `findWeakContainers`; the kit adds no CI guard.
- **K90 — The running game connects as a role that only reads and writes rows** (2026-11-26). An
  owner role migrates and then grants the app role (`grantAppRole`), with tables a game names as
  append-only or read-only; the kit's SQL, from Bingo Royale's, sets both roles up and takes the
  passwords on standard input only.
- **K91 — A restore refuses before it replaces** (2026-11-26). Everything that can refuse a restore
  is decided before the app is stopped. The kit's restore reads only the kit's backups; an older
  backup needs the game's documented rewrite and ages out (decided 2026-11-25).
- **K92 — The failure brake counts attempts under way** (2026-11-26). `reserve` gives an attempt
  one of the key's `limit` places until it is ended, so parallel guesses stay within the limit, and
  the brake's rule may be a function read at each check (from Bingo Royale's `loginBrake`).
  `braked` and `failed` stay for a route that cannot be tried in parallel.
