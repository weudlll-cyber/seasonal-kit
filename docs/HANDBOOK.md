# Handbook: how we build a Seasonal game

One place for every new game, and for every game that changes. Each rule names where it is
enforced: a CI job (`.github/workflows/ci.yml`), a lint rule (`eslint.config.js`), a test, a
git hook (`lefthook.yml`) or a working rule (`CLAUDE.md`). A rule enforced only by a working rule
is checked in review (`docs/code-review-checklist.md`). This handbook says how to build a game;
how a game is embedded in the website is the website's own docs, linked in the last section.

## How we work

| Rule                                                                                                                                                                                              | Enforced by                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| The owner decides. A decision is written down as a dated fact, never as a quote, in the repository's `docs/DECISIONS.md`, in the commit of the work it governs.                                   | CLAUDE.md "Source of truth"                                              |
| Planning happens in the Seasonal Entertainment planning chat. It writes one English task block per session; the session does that task and no other.                                              | DECISIONS K25; CLAUDE.md                                                 |
| Everything in a repository is English: code, comments, commit messages, docs.                                                                                                                     | CLAUDE.md "Language"                                                     |
| `master` is protected. Work happens on a branch and goes in through a PR; a PR merges only when every required check is green and the owner has approved, as a merge commit.                      | branch protection (K13, K19); the repository's settings (K24, RELEASING) |
| Push always: every commit is pushed, so nothing lives only on one PC.                                                                                                                             | CLAUDE.md; the night's morning sheet                                     |
| After a merge the branch is deleted on origin and locally; only `master` (and, during a night, its sheet branch) stays on origin.                                                                 | `delete_branch_on_merge` (K24); CLAUDE.md "Git"                          |
| Never force-push, never reset published history, never amend a pushed commit.                                                                                                                     | branch protection; CLAUDE.md "Git"                                       |
| A night runs as a chain of pieces: after each piece commit, push and update the night's morning sheet (`docs/NIGHT-<date>.md`: done, running, open, the owner's word, the SHAs, where to resume). | the night's task block; CLAUDE.md                                        |
| Screenshots are never committed and never pile up: each run deletes the last run's first.                                                                                                         | `.gitignore`; the showcase's global setup (K16)                          |
| One command at a time; no chains with `&&`, `;` or `\|` unless one tool needs the pipe.                                                                                                           | CLAUDE.md "Git"                                                          |
| The other repositories are read-only from a session: read with `git fetch` and `git show origin/<branch>:<path>`; something that looks wrong there is reported, not changed.                      | CLAUDE.md "Source of truth"                                              |

## The repository and the kit

- **Layout.** A game keeps its web client, its server and its shared contracts apart (Mini Games
  and Bingo: `apps/web`, `apps/server`, `packages/contracts`). Every source file starts with its
  header (see Hygiene).
- **The kit pin.** A game depends on the kit by tag, never by branch:
  `"@seasonal/kit": "github:weudlll-cyber/seasonal-kit#vX.Y.Z"` ([README](../README.md)). Its
  lockfile pins the tag's commit and its hash, so a moved tag would fail the install. Tags never
  move ([RELEASING.md](RELEASING.md)). A game moves to a new version in its own PR, with the
  owner's word (K1), following the CHANGELOG's "Migration, per game".
- **No install scripts.** The kit ships its compiled `dist/`; a game installs with scripts off
  (`ignore-scripts=true`) ([DELIVERY.md](DELIVERY.md)). Enforced: CI `verify` ("dist/ matches
  the source") and the delivery proof on every tag.
- **What a game does not have yet** is built as small as possible, marked with the kit request it
  waits for, and removed when the kit has it (Seasonal Cases' `packages/ui/src/pending/`). Never a
  second copy of a kit part.

## Security

| Rule                                                                                                                                                                                                                         | Enforced by                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| No secret in a repository: keys, tokens and passwords live in the server's environment. A recovery key is its own secret, never the TOTP key (K20).                                                                          | gitleaks: pre-commit hook and CI `gitleaks`                                                         |
| Every input from outside is checked before use, strictly: headers, query, body, messages between frames. Unknown fields are dropped, never passed on.                                                                        | the kit's checks and their tests (`identityFrom`, `parseChat`, `parseSeasonFeed`, `openRoundsPage`) |
| A sign-in trusts only the TCP peer and the proxy's secret, never a forwarding header (`websiteSignInCheck`, `req.socket.remoteAddress`).                                                                                     | `src/server/identity.test.ts`; ADOPTION "Risks"                                                     |
| Every route that costs something has a rate limit (`RateLimiter`, a fixed rule or one read per request).                                                                                                                     | the game's integration tests; `src/server/guards.test.ts`                                           |
| A server never fetches a URL it was handed without its guarded fetch: https only, public addresses only, no redirects, a timeout and a size limit. The kit has no fetch of its own; the season feed reader takes the game's. | `src/server/seasonFeed.test.ts`; the game's fetch tests                                             |
| Two-factor sign-in with TOTP and recovery codes stored as HMAC-SHA-256 with the server's key (K20); legacy SHA-256 codes keep working (K27).                                                                                 | `src/server/totp.test.ts`, `recoveryCodes.test.ts`                                                  |
| A return path stays on the site (`safeNext`); the chat frame is sandboxed (K17) and sends `strict-origin`; a frame from another origin is for local development on a loopback host only (`OriginChatFrame`).                 | `src/server/guards.test.ts`, `src/react/dock.test.tsx`, `casesRequests.test.tsx`                    |
| A Content Security Policy and framing headers on every page (`frame-ancestors`: the website only). The kit has no part for it; each game sets its own.                                                                       | each game's security pass ([security-pass.md](security-pass.md) is the kit's)                       |
| Dependencies are scanned and pinned exactly; actions are pinned to a full SHA; Renovate updates them in reviewed PRs, never automerged.                                                                                      | CI `osv-scanner`, `analyze` (CodeQL); `sha_pinning_required` (K24); `tests/renovate.test.ts`        |
| Before a minor or major release, a security pass with a fresh, independent reviewer.                                                                                                                                         | [RELEASING.md](RELEASING.md) step 2; [security-pass.md](security-pass.md)                           |

## Hygiene

| Rule                                                                                                                                                    | Enforced by                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Every source file starts with a header: what it is, why it exists, where it came from (repository, path, commit). Important blocks get inline comments. | CLAUDE.md "Hygiene"; review                                                          |
| A file has at most 300 lines (a test 400), a function at most 60, a complexity of at most 12. Split by responsibility.                                  | ESLint `max-lines`, `max-lines-per-function`, `complexity` (CI `verify`, pre-commit) |
| No dead code, no unused variables or exports, no `console.log` outside the CLI scripts.                                                                 | ESLint `no-unused-vars` (TypeScript), strict `tsc`; review                           |
| Search before writing a helper; name each reused one in the report.                                                                                     | CLAUDE.md; the PR's report                                                           |
| No duplicated parts: what the kit has, the game takes from the kit. A shared class, keyframe or data attribute is `sk-` / `data-sk-` prefixed.          | `tests/prefix.test.ts` (K7, K31); ADOPTION.md                                        |
| Formatting is Prettier's.                                                                                                                               | pre-commit hook; CI `verify` (`format:check`)                                        |
| The season colours are the website's, never edited by hand.                                                                                             | CI `verify` (`scripts/season-check.mjs`, K3)                                         |

## Tests

| Rule                                                                                                                                                                                                 | Enforced by                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Every rule gets a test that fails without it; it is run once without the change to see it fail. No test written only for the number.                                                                 | CLAUDE.md "Hygiene"; review                          |
| Coverage stays at 95 % or more of lines, branches and functions.                                                                                                                                     | Vitest thresholds (CI `verify` fails below)          |
| What only a browser shows is tested in a browser: e2e (Playwright) for screens, layout measured, not read from text.                                                                                 | the kit's `showcase/layout.spec.ts`; each game's e2e |
| Accessibility: axe with the WCAG 2.0–2.2 A and AA rules finds nothing serious, in light and dark, at desktop and phone sizes; pointer targets are 24 px or more (K33), phone touch targets 40/44 px. | CI `showcase` (required, K19); the game's e2e        |
| Text never goes below the game's floor (K14): `FIT_FLOORS` and `fit.css`, never below what the game has today.                                                                                       | `tests/fit-floors.test.ts`; the game's size tests    |
| Test data and screenshots are cleaned up: each run starts empty and leaves nothing committed.                                                                                                        | the showcase's global setup; `.gitignore` (K16)      |
| Tests never wait on the clock: time is passed in.                                                                                                                                                    | review (the kit's limiter and readers take `now`)    |

## Docs

| Rule                                                                                                             | Enforced by                  |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `docs/DECISIONS.md`: the owner's decisions as dated facts, numbered, never reversed without a task that says so. | CLAUDE.md "Source of truth"  |
| `docs/BACKLOG.md`: part one open, part two done; a closed item moves to part two and names what closed it.       | CLAUDE.md "Hygiene"          |
| `docs/OPEN.md`: the questions only the owner can answer.                                                         | CLAUDE.md                    |
| `CHANGELOG.md`: every change, and for a release its "Migration, per game".                                       | [RELEASING.md](RELEASING.md) |
| Docs, headers, CHANGELOG, BACKLOG and OPEN change in the same commit as the code.                                | CLAUDE.md "Hygiene"; review  |
| Links between the repository's own files stay valid.                                                             | CI `docs` (lychee, offline)  |

## The kit parts every game uses

The exports are in the [README](../README.md); what each replaces per game is in
[ADOPTION.md](ADOPTION.md).

- **Header with back link:** `AppHeader` with `BackLink` in website mode; folds into its Menu
  whenever its items do not fit (`header.css`).
- **Game bar:** `GameBar` with `usePanels`, `useFullscreen`, `useFocusMode`, its toggles
  (`bar.css`).
- **Dock and chat:** `DockedScreen`, `ChatDock`, `WebsiteChatFrame` (`dock.css`); `useDockReserve`
  without a chat yet; `onUnread` for the bar's count.
- **Call slot:** `callSlot`, `CALL_SLOT` (`call.css`), hidden until a call is linked.
- **Fit floors:** `useFitScale` and `fit.css` with the game's `data-sk-game`; `MIN_POINTER_TARGET`.
- **Result frame and start card:** `ResultFrame` (a page, or a `panel`) and `StartCard`
  (`frames.css`).
- **Sign-in:** the website sign-in in the client (`websiteSignInHref`, `signInAgain`) and on the
  server (`websiteSignInCheck`, `safeNext`, TOTP, recovery codes, `SessionEnds`).
- **Rate limiter:** `RateLimiter` with the game's own rules.
- **Open-rounds publisher:** `openRoundsPage` behind the game's `GET /api/public/open-rounds`.
- **Season feed:** `seasonFeedReader` with the game's guarded fetch.

## Embedding in the website

A game runs standalone and, once embedded, under `/games/<slug>/` on the website's origin: the
website signs its members in, frames its chat, lists its open rounds and publishes the season.
How a game is added and what the two sides exchange is the website's to say, and is not copied
here:

- [ADDING-A-GAME.md](https://github.com/weudlll-cyber/seasonal-entertainment/blob/master/docs/ADDING-A-GAME.md):
  what a game provides, what changes in the website, what an admin and the installer do, and
  the checklist.
- [GAME-INTEGRATION.md](https://github.com/weudlll-cyber/seasonal-entertainment/blob/master/docs/GAME-INTEGRATION.md):
  the sign-in headers, the chat embed, the back link, the call slot and the season feed.
- [OPEN-ROUNDS.md](https://github.com/weudlll-cyber/seasonal-entertainment/blob/master/docs/OPEN-ROUNDS.md):
  the open-rounds page the website reads.
