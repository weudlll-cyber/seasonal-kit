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
- **K8 — The Luxora Grotesk font ships in the kit.** The Seasonal Tokens project bought the
  font. It may be used and shipped in the kit. It is not covered by the kit's AGPL licence
  (licence note: [fonts/README.md](../fonts/README.md)). This closes kit BACKLOG 7.
- **K7 — The `sk-` prefix.** Shared CSS classes and keyframes use the prefix `sk-`. It replaces
  `sbr-` and `smg-` in shared parts only; a game's own parts keep its prefix.
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
