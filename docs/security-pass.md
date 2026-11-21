# Security pass

The results of each security pass over the kit, newest first. Each pass names its tools with
their versions, the commands, every finding with its verdict, and what was fixed. Adapted from
Mini Games' `docs/security-pass.md` (at `93ed780`) to a library: no server, no web pages of its
own, so no web scan; the scans are those of CI, run over the whole history and the lockfile.

A pass is due before each minor or major release (docs/RELEASING.md) and after any change to the
delivery (docs/DELIVERY.md).

## What a pass covers

| Scan                         | Tool                                            | Command                                                                            |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (the image CI uses)             | `gitleaks git /repo --log-opts="--all" --redact`                                   |
| Dependencies                 | osv-scanner 2.7.0 (the image CI uses)           | `osv-scanner scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml`      |
| Code                         | CodeQL (javascript-typescript, CI)              | `.github/workflows/codeql.yml`; results in the repository's code scanning alerts   |
| Install behaviour            | pnpm 12.14.0                                    | a scratch consumer installs the tag with scripts off and builds (docs/DELIVERY.md) |
| Package contents             | `git ls-tree` of the tag against `package.json` | only the folders in `"files"`, `LICENSE` and `package.json` reach a game           |
| Frame messages and redirects | review against the rules below, and the tests   | `src/*.test.ts` for the chat link, the call link and the sign-in helpers           |

## The message layers (since v0.3.0)

The chat embed (`src/chatEmbed.ts`) and the call view (`src/callView.ts`) talk to a website
frame through one link (`src/frameMessages.ts`). These rules hold, and each one has a test that
fails if it breaks:

- **Origin checks, both ways.**
  - A message is handed on only if four checks pass: `event.origin` is the frame's origin,
    `event.source` is that frame's own window, the data is a plain object, and its `source` is
    the frame's (`seasonal-chat` or `seasonal-call`).
  - The page posts only to that frame, with the frame's origin as `targetOrigin`. It never uses
    `'*'`.
  - The origin is checked when the link is made: `'*'`, `'null'`, a path or a trailing slash
    throws, so a typo cannot widen the check.
  - The website's own frames are on the page's origin, which is the default.
- **No secrets.**
  - The page sends only flags (`visible`, `mute`, `collapse`) and a theme name.
  - Each outgoing message is rebuilt from its own fields, so nothing else the caller put on the
    object rides along. The `source` is set last and cannot be overridden.
  - The kit reads no token, key or message text, and the website's frames send none.
- **Unexpected messages are ignored, silently.** That covers:
  - another origin or window, the other frame's `source`, data that is no object;
  - an unknown `type`, including inherited names such as `toString`;
  - a field of the wrong type or range (negative or fractional counts, an infinite size, a
    status or reason outside the contract);
  - an error code that is not a short lower-case word;
  - a call view's `ready` for another call than the one linked.

  Extra fields are dropped. Nothing is logged and nothing throws, so a hostile page or frame
  learns nothing from a rejection.

- **The worst a valid message can do** is set a badge count, a height, or the call view's
  state. Every `ready` makes the page answer once, and only to its own frame.
- **Nothing is framed by the kit.** It builds the chat's address (relative, on this site) but no
  element. It builds no call address at all until the site's `/embed/call/<id>` page exists
  (BACKLOG 8), and `connectCall` needs a valid call id.
- **Sign-in redirects stay on this site.** `websiteSignInHref`, `websiteLoginHref` and
  `signInAgain` throw for a route that is not a path on this site (`//host`, a backslash, a
  scheme). `signInAgainAfter` ignores such a header value, so a response cannot send the page
  elsewhere.

## Passes

### 2026-11-21 — before v0.9.0, the header, dev tools and recovery key (branch `feat/v0.9.0`, PR #16)

| Scan                         | Tool and command                                                                                  | Result                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 35 commits scanned.                                                                               |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 262 packages. No dependency was added.                                                         |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on PR #16 and after the merge (docs/NIGHT-2026-11-22.md).                                              |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.9.0, after it is cut (docs/DELIVERY.md).                                               |
| The dev tools and the codes  | an independent review (a fresh agent given only the diff, AUTH.md and GAME-INTEGRATION §2–§4)     | No high finding; 5 medium, 7 low. Each was checked against the code; the list below says what became of it. |

The review's findings:

1. **Medium:** the header claimed AUTH.md's rule for the separate key, but AUTH.md keeps plain
   SHA-256. **Fixed:** the header names K20 as a departure from AUTH.md. The text the website's
   AUTH.md would need is in PR #16.
2. **Medium:** legacy SHA-256 codes stay brute-forceable from a leak, and plantable by whoever
   can write the table, until used or replaced. **Kept by D4**, documented in the header, the
   CHANGELOG and ADOPTION's "Needs the owner's word" (an end date per game).
3. **Low:** weak keys accepted. **Fixed:** the key must be bytes, not one byte repeated.
4. **Low:** a wrong-length stored hash hid a bad key. **Fixed:** the key is checked first.
5. **Medium:** `devStubPlugin` saw relative imports only. **Fixed** for absolute imports. Package
   names, `paths` aliases and `#imports` are documented as not seen; both games import their
   dev modules relatively, and the bundle scan is the backstop.
6. **Medium:** no kit marker for a server bundle. **Fixed:** `DEV_SIGN_IN_MARKER` is in
   `KIT_DEV_MARKERS`.
7. **Low:** a g or y regex matches every other time. **Fixed:** both functions throw on one.
8. **Low:** an unanchored load pattern let any text through. **Fixed:** the whole name must
   match, at most 64 characters.
9. **Low:** `Dirent.parentPath` needs Node 20.12. **Not a defect:** `engines` is Node ≥ 22.
10. **Low:** a rejected dev sign-in was an unhandled rejection. **Fixed:** it shows an alert.

The review's other points were "no defect" (timing and encoding, prototype keys, the contract)
or test gaps, now filled by the fixes' tests.

### 2026-11-21 — before v0.8.0, the server entry (branch `feat/server-auth`, PR #13)

| Scan                         | Tool and command                                                                                                                     | Result                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                                                                  | No leaks. 30 commits with a patch scanned (42 commits in all refs, merges included).  |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml`                                    | No issues. No dependency was added: the entry uses only `node:crypto` and `node:net`. |
| Code                         | CodeQL (javascript-typescript)                                                                                                       | Read on PR #13 and after the merge (docs/NIGHT-2026-11-21.md).                        |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                                                            | Proven on the tag v0.8.0, after it is cut (docs/DELIVERY.md).                         |
| Independent review           | three separate review agents that did not write the code, each given only the diff, GAME-INTEGRATION §2–§4 and the website's AUTH.md | See below: every confirmed finding fixed; the third verdict clean.                    |

**Review 1** (on the first version): 3 medium and 7 low findings, all confirmed.

| Finding (severity)                                                                                                               | Fix                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A blank or bad CIDR prefix (`127.0.0.1/`) read as /0, trusting every peer (medium)                                               | the prefix must be 1–3 digits within 32 or 128, else the list throws                  |
| Node joins a repeated header with ", ": an injected `Roles: admin` became `game_admin`, a doubled guest header a member (medium) | the role must be exactly one of member, organiser, admin; a guest header fails closed |
| An empty base32 text decoded to a 0-byte TOTP key (medium)                                                                       | a secret under 16 bytes is refused by `base32Decode`, `hotp` and `matchingStep`       |
| Dot segments (`..`, `%2e%2e`) in `next` left the base path (low)                                                                 | refused in `next` and in the base path                                                |
| The limiter's map had no bound; `Infinity` broke the rule (low)                                                                  | `maxKeys`, strict rule checks, a clock going back drains nothing                      |
| A missing steps header was not marked (low)                                                                                      | marked `bad`                                                                          |
| A user id with leading zeros or beyond a safe integer (low)                                                                      | a positive safe integer without leading zeros                                         |
| An async listener's rejection escaped `SessionEnds` (low)                                                                        | awaited and reported                                                                  |
| Mixed-case header names never matched (low)                                                                                      | compared in lower case                                                                |
| `mappedRoles` did not say it adds to `player` (info)                                                                             | said so                                                                               |

**Review 2** (on the fixed version, a new agent): 1 medium and 6 low findings.

| Finding (severity)                                                                 | Fix                                                                                                       |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A full limiter scanned 100 000 keys for every new key (medium, from the first fix) | a full map is scanned at most once a tenth of the window; a newcomer is refused without a scan in between |
| `SessionEnds.end` could reject unawaited and end the process (low)                 | it never rejects; failures go to the game's `onError`                                                     |
| A step icon could name any route of the site (low)                                 | exactly `/media/step-icons/<32 hex>.webp`, the contract's form                                            |
| The otpauth link wrote `+` for spaces (low)                                        | `%20`                                                                                                     |
| Ten recovery codes were not guaranteed distinct (low)                              | drawn until ten differ                                                                                    |
| A `NaN` clock poisoned a bucket (low)                                              | a time that is not finite touches no bucket                                                               |
| The website name could be cut inside a surrogate pair (low)                        | never                                                                                                     |

**Review 3** (a new agent): **VERDICT: CLEAN**. No finding of medium or higher; 5 low ones, fixed.

| Finding (severity)                                      | Fix                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `next` with `%2f`, `%5c` or `%00` in its path (low)     | refused                                                                                |
| An async `onError` that rejects (low)                   | caught                                                                                 |
| A listener that never settles keeps `end` pending (low) | documented: routes call `void ends.end(ids)`; every listener has heard the ids already |
| TOTP threw at a `NaN` or pre-first-step time (low)      | matches nothing                                                                        |
| An empty guest header was read as no guest (low)        | a guest                                                                                |

Not changed, recorded:

- **Recovery codes** are unsalted SHA-256 of about 40 bits, as AUTH.md specifies. A leaked
  database could be brute-forced offline. An HMAC with a server key would be a change to the
  contract, so it needs the owner's word.
- **Names arrive as Node decodes header values, latin1.** If the website ever allows non-ASCII
  usernames, the game decodes them first. That is a question for the website's owner.
- **The account key is (website origin, user id)** per §3. The game adds the origin; the identity
  carries only the id.

### 2026-11-21 — before v0.7.0 (branch `feat/showcase`, PR #12)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 25 commits with a patch scanned (36 commits in all refs, merges included).                                                                                  |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues. New, both devDependencies pinned as Mini Games pins them: `@playwright/test` 1.64.1, `@axe-core/playwright` 4.13.0. Neither reaches a game.                |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on PR #12 and after the merge (docs/NIGHT-2026-11-21.md).                                                                                                        |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.7.0, after it is cut (docs/DELIVERY.md). Playwright's browser is installed by hand (`pnpm exec playwright install`), never by an install script. |
| Package contents             | `"files"` against the new folders                                                                 | `showcase/` and `playwright.config.ts` are outside `"files"`. The screens are git-ignored and never uploaded by CI.                                                   |
| Accessibility                | axe (WCAG 2.0–2.2 A, AA) in the showcase, 20 screens                                              | No serious or critical violation.                                                                                                                                     |

No finding, so nothing was fixed. The two defects the showcase found (the dock's height on a
phone, the result's rows) were layout, not security.

### 2026-11-21 — before v0.6.0 (branch `feat/game-bar`, PR #11)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 22 commits with a patch scanned (32 commits in all refs, merges included).                                                                                                            |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues. No dependency was added.                                                                                                                                                             |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on PR #11 and after the merge (docs/NIGHT-2026-11-21.md).                                                                                                                                  |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.6.0, after it is cut (docs/DELIVERY.md).                                                                                                                                   |
| The new parts                | review                                                                                            | Full screen only on a click, never inside another page's frame; a refusal is caught. The focus mark is a bare attribute on `<html>`, removed with the last screen. No message, storage or link. |

No finding, so nothing was fixed.

### 2026-11-21 — before v0.5.0 (branch `feat/frames`, PR #10)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 19 commits with a patch scanned (28 commits in all refs, merges included).                                              |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues. No dependency was added.                                                                                               |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on PR #10 and after the merge (docs/NIGHT-2026-11-21.md).                                                                    |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.5.0, after it is cut (docs/DELIVERY.md).                                                                     |
| The new parts                | review                                                                                            | Both frames render only what the game passes, as React children: no HTML from strings, no link, no frame, no message, no storage. |

No finding, so nothing was fixed.

### 2026-11-21 — before v0.4.0 (branch `feat/screen-blocks`, PR #8)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 15 commits with a patch scanned (22 commits in all refs, merges included).                                                                                                                                                                    |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 257 packages. New, all devDependencies pinned exactly as both games pin them: react and react-dom 19.3.1, @types/react and @types/react-dom 19.3.0, @testing-library/react 16.3.3, @testing-library/dom 10.4.2. React is an optional peer. |
| Code                         | CodeQL (javascript-typescript)                                                                    | `analyze` and `CodeQL` green on PR #8; the alert list is read after the merge (docs/NIGHT-2026-11-21.md).                                                                                                                                               |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.4.0, after it is cut (docs/DELIVERY.md).                                                                                                                                                                                           |
| Frame messages and redirects | the rules above                                                                                   | The React chat frame uses only `connectChat`: no listener or post of its own. It always sends `strict-origin`, builds its address only by `chatEmbedUrl` (a path on this site), and links nothing outside a dock. The back link is the fixed `/games`.  |

No finding, so nothing was fixed.

### 2026-11-20 — before v0.3.0 (branch `feat/website-integration`, PR #6)

| Scan                         | Tool and command                                                                                   | Result                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                                | No leaks. 11 commits with a patch scanned (16 commits in all refs, merges included).                                                                    |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml`  | No issues in 237 packages. No dependency was added.                                                                                                     |
| Code                         | CodeQL (javascript-typescript)                                                                     | `analyze` and the code-scanning check `CodeQL` green on PR #6. The repository's alert list (`gh api …/code-scanning/alerts`) is empty, open and closed. |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                          | The tag v0.3.0 installs with no script; `vite build`, `tsc` and a Vitest test pass (docs/DELIVERY.md).                                                  |
| Package contents             | the installed package                                                                              | `package.json`, `LICENSE`, `README.md`, `browser/`, `css/`, `dist/`, `fonts/`. No source, test or config.                                               |
| Frame messages and redirects | the rules above, against `src/frameMessages.ts`, `chatEmbed.ts`, `callView.ts`, `websiteSignIn.ts` | Every rule holds. Each has a test, and coverage is 100 % of lines, branches and functions.                                                              |

No finding, so nothing was fixed.

### 2026-11-20 — the first pass, before v0.2.0 (branch `feat/fonts`, PR #3)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 6 commits with a patch scanned (8 commits in all refs, merges included).                                                                                                   |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 237 packages. The minimatch override still holds.                                                                                                                       |
| Code                         | CodeQL (javascript-typescript)                                                                    | The `analyze` check and the code-scanning check green on PRs #1 and #2 and on master's merge commits. The alert list itself was not read: `gh api` is not permitted in this session. |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | The branch installs with no script. `vite build` emits the five woff2 files; every CSS `url()` resolves (docs/DELIVERY.md).                                                          |
| Package contents             | the installed package                                                                             | `package.json`, `LICENSE`, `README.md`, `browser/`, `css/`, `dist/`, `fonts/` (with its licence note). No source, test or config.                                                    |
| Binary assets                | sha256 of the five woff2 files, compared with the Mini Games, Bingo Royale and website copies     | Byte-identical everywhere (fonts/README.md). The kit's test keeps them so.                                                                                                           |

No finding, so nothing was fixed.

## Checks of the tools themselves

- **2026-11-20, the pre-commit secret scan.** A staged file with a fake AWS key and a fake GitHub
  token went through the hook's first version: lefthook passed `{root}` on literally, Docker
  mounted an empty volume, git in the container failed, and gitleaks reported "no leaks found".
  **Fixed:** `scripts/gitleaks-staged.sh` mounts `git rev-parse --show-toplevel` and allows it as
  a git `safe.directory`. Run again on the same staged file, the hook found the leak and refused
  the commit (exit 1). The probe file was removed and never pushed.
- **2026-11-20, osv-scanner on the first master push.** One finding: GHSA-g3hv-75wg-m249,
  minimatch 10.2.6 (ReDoS in glob patterns, CVSS 6.9), pulled only by typescript-eslint 8.71.2.
  It is not exploitable here: only the repository's own globs, and nothing a game receives. Mini
  Games accepts the same advisory below CVSS 7. The kit fails on any finding, so instead of an
  ignore entry it is **fixed**: an override to 11.0.9, the fixed line ESLint already uses. Lint
  and the tests pass, and osv-scanner finds nothing.
