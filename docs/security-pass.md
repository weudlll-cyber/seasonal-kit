# Security pass

The results of each security pass over the kit, newest first. Each pass names its tools with
their versions, the commands, every finding with its verdict, and what was fixed. Adapted from
Mini Games' `docs/security-pass.md` (at `93ed780`) to a library: no server, no web pages of its
own, so no web scan; the scans are those of CI, run over the whole history and the lockfile.

A pass is due before each minor or major release (docs/RELEASING.md) and after any change to the
delivery (docs/DELIVERY.md).

## What a pass covers

| Scan                         | Tool                                            | Command                                                                               |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (the image CI uses)             | `gitleaks git /repo --log-opts="--all" --redact`                                      |
| Dependencies                 | osv-scanner 2.7.0 (the image CI uses)           | `osv-scanner scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml`         |
| Code                         | CodeQL (javascript-typescript, CI)              | `.github/workflows/codeql.yml`; results in the repository's code scanning alerts      |
| Install behaviour            | pnpm 12.14.0                                    | a scratch consumer installs the tag with scripts off and builds (docs/DELIVERY.md)    |
| Package contents             | `git ls-tree` of the tag against `package.json` | only the folders in `"files"`, `LICENSE`, `README.md` and `package.json` reach a game |
| Frame messages and redirects | review against the rules below, and the tests   | `src/*.test.ts` for the chat link, the call link and the sign-in helpers              |

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
  scheme, and since v0.9.1 any space, tab or newline, which the URL parser drops: audit
  2026-11-22). `signInAgainAfter` ignores such a header value, so a response cannot send the page
  elsewhere.

## Passes

### 2026-11-26 — before v0.34.0, the fixes (branch `fix/minigames-findings`)

| Scan                         | Tool and command                       | Result                                     |
| ---------------------------- | -------------------------------------- | ------------------------------------------ |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI | No leaks.                                  |
| Dependencies                 | osv-scanner (CI)                       | No dependency was added.                   |
| Code                         | CodeQL (javascript-typescript)         | Read on the pull request before the merge. |

**Read by the session that wrote it.** The owner role's `TEMPORARY` adds nothing it could not
already do with `CREATE`; `PUBLIC` and the app role get neither. The secrets folder comes from the
game's own root-owned settings and goes to the restore as one quoted argument; a differing file
still stops it before anything changes. A frame source on plain http is matched whole against five
local host forms, so a look-alike host is refused (tested). `retry` sends a write twice only when
the game says so for a refusal, never after no answer. The contrast guard treats what it cannot
work out as a finding.

### 2026-11-26 — before v0.33.0 (branch `fix/bingo-findings`)

| Scan                         | Tool and command                                           | Result                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI                     | No leaks.                                  |
| Dependencies                 | osv-scanner (CI)                                           | No dependency was added.                   |
| Code                         | CodeQL (javascript-typescript)                             | Read on the pull request before the merge. |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true` | Proven on the tag (docs/DELIVERY.md).      |

**Read by the session that wrote it.** The restore: the secret files are compared before the app
is stopped and copied after the database and volumes; a file changed between the two would be
overwritten, a window that needs write access to the secrets folder during a restore. The brake:
a key holds at most `limit` slots, attempts under way included, and the map's bound counts those
keys too; an attempt that is never ended ages out with the window, so a route's lost call cannot
brake a key for longer. A sign-in that does not call `reserve` still lets parallel guesses
through (CHANGELOG, migration). A restore without `--secrets-to` still only names the secrets.

### 2026-11-26 — before v0.32.0 (branch `feat/ops-db-roles`)

| Scan                         | Tool and command                                           | Result                                                                              |
| ---------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI                     | No leaks.                                                                           |
| Dependencies                 | osv-scanner (CI)                                           | `pg` and `@types/pg` 8.23.1 added, development only (the test); no runtime package. |
| Code                         | CodeQL (javascript-typescript)                             | Read on the pull request before the merge.                                          |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true` | Proven on the tag (docs/DELIVERY.md).                                               |

**Read by the session that wrote it** (SQL built from settings): names and passwords are checked
against plain forms before they enter any statement; the passwords travel on standard input only
and are never printed. Proven on a real PostgreSQL 17.

### 2026-11-26 — before v0.31.0 (branch `feat/ops-hardening`)

| Scan                         | Tool and command                                           | Result                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI                     | No leaks.                                  |
| Dependencies                 | osv-scanner (CI)                                           | No dependency was added.                   |
| Code                         | CodeQL (javascript-typescript)                             | Read on the pull request before the merge. |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true` | Proven on the tag (docs/DELIVERY.md).      |

Test code only: it reads an object and runs nothing. The database's capabilities were measured in
throw-away containers (a fresh volume: first start and restart); an upgrade over existing data was
not measured.

### 2026-11-26 — before v0.30.0 (branch `feat/ops-host-baseline`)

| Scan                         | Tool and command                                           | Result                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI                     | No leaks.                                  |
| Dependencies                 | osv-scanner (CI)                                           | No dependency was added.                   |
| Code                         | CodeQL (javascript-typescript)                             | Read on the pull request before the merge. |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true` | Proven on the tag (docs/DELIVERY.md).      |

**Read by the session that wrote it** (it changes a server): SSH ports come from `sshd -T`, never
assumed, and are allowed before the firewall is on; the SSH configuration is only read; nothing is
removed or upgraded. Proven with stand-ins only: a rehearsal on a real Ubuntu 24.04 server is each
game's adoption.

### 2026-11-26 — before v0.29.0 (branch `feat/ops-admin`, PR #76)

| Scan                         | Tool and command                                           | Result                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Secrets in the whole history | gitleaks in the pre-commit hook and CI                     | No leaks.                                  |
| Dependencies                 | osv-scanner (CI)                                           | No dependency was added.                   |
| Code                         | CodeQL (javascript-typescript)                             | Read on the pull request before the merge. |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true` | Proven on the tag (docs/DELIVERY.md).      |

**Read by the session that wrote it** (it removes data): the environment name is a plain word before
it becomes part of a path; the game's folders must be two names deep; uninstall asks for the name,
refuses unknown options and keeps the backups unless asked; every `rm -rf` has a guarded variable.
Proven with stand-ins; a rehearsal on a real server is each game's adoption.

### 2026-11-26 — before v0.28.0 (branch `feat/checks-icons-link-operator`, PR #74)

| Scan                         | Tool and command                                                                                  | Result                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 173 commits scanned.                      |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 258 packages. No dependency was added. |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on the pull request before the merge.          |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true`                                        | Proven on the tag (docs/DELIVERY.md).               |

**Read by the session that wrote them:** `ops/lib/operator.sh` reads its file as text and never
runs it, accepts only a plain address and says it only in "using … from …"; the four icon files
carry no script, event handler or outside address. No finding.

### 2026-11-26 — before v0.27.0 (branch `fix/cases-findings`, PR #72)

| Scan                         | Tool and command                                                                                  | Result                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 164 commits scanned.                      |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 258 packages. No dependency was added. |
| Code                         | CodeQL (javascript-typescript)                                                                    | No open alert on the pull request's merge ref.      |
| Install behaviour            | pnpm and npm, scratch consumers with `ignore-scripts=true`                                        | Proven on the tag (docs/DELIVERY.md).               |

**Review of the new relaxations** (by the session that wrote them, not an independent reader):
`localOrigins`, `crossOrigin`, the frame source with a path, the cookie's path and the units' path.

1. **Medium, fixed:** `guardedFetch` used Node's shared connection pool, so a socket opened by any
   caller to the same host and port, for example to a local origin, could carry a guarded call
   without the guarded lookup. Every call now opens its own connection, with a test that fails
   without it.
2. Kept as designed: a local origin's name is trusted to resolve anywhere (it comes from the
   server's configuration); `allowedHosts` and the redirect refusal hold for it too.
3. Kept as designed: a named cross-origin write passes without the same-site checks, so the game's
   own token or the route's own origin list remains its second layer.

### 2026-11-23 — before v0.11.0 (branch `night/2026-11-23`)

| Scan                         | Tool and command                                                                                  | Result                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 69 commits scanned.                          |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 262 packages. No dependency was added.    |
| Code                         | CodeQL (javascript-typescript)                                                                    | `analyze` green on every push to the release PR (#24). |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | Proven on the tag v0.11.0 (docs/DELIVERY.md).          |

**The independent review.** The brief named pieces 6 and 7, the two server parts that take
outside input: the season feed reader and the rate limiter with a rule read per request. A
fresh reviewer read only their code, tests and the feed's contract. It found nothing high, two
medium and several low. Each was checked against the code and fixed, with a test that fails
without its fix:

1. **Medium:** the 64 KiB cap did not bound memory. A body without a length was read whole
   first. The body is now counted in bytes as it streams, and cancelled past 64 KiB.
2. **Medium:** the limiter kept the caller's rule object. A fixed rule changed in place, or the
   same object broken by an admin, skipped the check, and `limit: Infinity` lifted the limit.
   Each rule is now read once into a frozen copy, checked, and only the copy is kept.
3. **Low:**
   - A refused answer's body is now cancelled, never left open.
   - The reader has its own timer over the whole read, so a wrapper that drops the signal still
     times out.
   - A redirected answer is refused.
   - Overlapping reads now share one request.
   - The reader's options must be whole milliseconds.
   - A clock that gives no finite time makes the answer stale.
   - Impossible dates (`02-30`) and days are refused, as are out-of-order halving days and more
     than 64 of them.
   - A window must be 1 ms or more, whole, so no denormal window can lock a key out.
   - A source that gives `null` fails as a broken rule.
4. **Low, not new:** a key's length is not bounded. The limiter's header now says that games
   pass short, normalised keys.

The sign-in, recovery-code and TOTP logic is unchanged.

### 2026-11-22 — before v0.10.0, focus and API (branch `night/2026-11-22-v0.10`)

| Scan                         | Tool and command                                                                                  | Result                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 47 commits scanned.                                                                         |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues. No dependency was added.                                                                   |
| Code                         | CodeQL (javascript-typescript)                                                                    | Read on the release PR (docs/NIGHT-2026-11-22b.md).                                                   |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | After the tag (docs/RELEASING.md step 7); the owner looks at the focus-ring screens before the merge. |
| The changed parts            | an independent review (a fresh agent given only the diff, AUTH.md and GAME-INTEGRATION §2–§4)     | No high finding; 1 medium, 3 low. Each checked against the code; all four fixed.                      |

The diff reviewed: the server's type rename and the recovery-code header, the dev tools'
options object, `MenuFold`, `ChatDock`, `useDisclosure` and the contrast script. The server's
sign-in and recovery-code logic is unchanged.

1. **Medium:** `MenuFold` closed on a blur to nowhere. Safari focuses no link or button on a tap,
   so tapping a second item in the phone menu closed it before the tap landed. **Fixed:** only a
   focus that moves to a known element outside closes it; presses outside stay the pointerdown
   listener's. Tested.
2. **Low:** the header-background check skipped stops it could not read (`rgba()`, 8-digit hex,
   names). **Fixed:** every stop must parse, or the check throws. Tested.
3. **Low:** checking the stops alone missed a blend darker than both ends. **Fixed:** 15 points
   between each two stops are checked too. Tested.
4. **Low:** the chat sheet took the focus when a resize brought back the phone layout with the
   sheet open. **Fixed:** only the opening moves the focus. Tested.

The reviewer also asked for tests of the new rules, which were outside the diff it was given;
they are in `src/react/header.test.tsx`, `src/react/dock.test.tsx`, `src/react/shell.test.tsx`,
`tests/contrast.test.ts` and `tests/focus-and-targets.test.ts`.

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
   can write the table, until used or replaced. **Kept by D4**, documented in the header and
   the CHANGELOG. On 2026-11-22 the owner decided that legacy codes stay valid with no end date
   (K27).
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

A second fresh review ran on the fixed diff, given the same material. It found no high
finding, 1 medium and 5 low. Each was checked:

1. **Medium:** nothing tied `KIT_DEV_MARKERS` to what `DevSignIn` renders. **Fixed:** a test
   renders the open menu and expects every client marker in it.
2. **Medium-low:** the plugin's comment said "resolved file", but it tests the import's path as
   written. **Fixed:** the header says so, and that the pattern must match how the game writes
   the import (with `.js`, as NodeNext requires and both games do).
3. **Low:** the body's `as` could be inherited. **Fixed:** only an own `as` counts.
4. **Low:** the kit does not refuse to run the dev sign-in in production itself.
   **Not changed:** the game's dev switch and the stub are the contract, as in both games
   today. A `NODE_ENV` guard could break a game's dev or e2e setups; noted for the audit.
5. **Low:** the stored-hash check counted elements, not bytes. **Fixed:** `byteLength`.
6. **Low:** `parentPath` again. **Not a defect** (Node ≥ 22).

With these fixes nothing confirmed is open: A2 and A5 are clean.

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
