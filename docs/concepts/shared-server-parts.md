# Shared server parts: what the three games each built

An investigation, read-only, no code (night audit 2026-11-25, piece 9). Nothing in the kit changes
with this page; it recommends, and the owner decides.

**Status (2026-11-26):** items 1 to 4 of the recommended order below are in the kit since v0.21.0
(DECISIONS K61 to K64; K60 for the CSRF check). Nothing in a game has changed: each adopts on the
owner's word ([ADOPTION.md](../ADOPTION.md)). Since v0.25.0 the installer's route-file step (5) and the load helper (6) are in the kit too
(K72, K73); the rest of the installer stays in the games.

Read on 2026-11-25 from each game's `origin/master`: Seasonal Bingo Royale `2380ea7`, Seasonal
Mini Games `1988346`, Seasonal Cases `073f9ad`. "Alike" is the share of a file's code lines (blank
lines and comments left out) that the other file has too, trimmed and compared line by line: a
rough measure, good for ordering, not for proof. Bingo and Cases pin kit v0.11.1 on `master`; Mini Games has adopted the kit and pins v0.18.0 (PRs #53 to #55).

## At a glance

| Part                     | Bingo                                     | Mini Games                                  | Cases                                  | Alike (Bingo / Mini Games) | Kit part worth it |
| ------------------------ | ----------------------------------------- | ------------------------------------------- | -------------------------------------- | -------------------------- | ----------------- |
| Backup and restore       | `ops/lib/backup.sh` 248 lines             | `ops/lib/backup.sh` 153                     | **none** (proved below)                | 52 % / 72 %                | yes, first        |
| Guarded fetch            | none                                      | `seasons/safeFetch.ts` 99, `safePost.ts` 87 | none                                   | one game only              | yes, second       |
| Session cookie and CSRF  | `auth/sessionPlugin.ts` 155               | `auth/sessionPlugin.ts` 137                 | `session.ts` 121                       | 72 % / 80 %                | yes, small        |
| Security headers, CSP    | `plugins/securityHeaders.ts` 60           | `plugins/securityHeaders.ts` 99             | helmet in `web.ts`, own options        | 80 % / 51 %                | yes, as data      |
| Health routes            | `routes/health.ts` 43                     | `routes/health.ts` 46                       | `healthRoutes.ts` 30                   | 78 % / 72 %                | yes, tiny         |
| Installer                | `ops/install.sh` 206 (33 files in `ops/`) | `ops/install.sh` 192 (25)                   | `deploy/install.sh` 213 (8 in deploy/) | 41 % / 48 %                | later, large      |
| Socket client / test kit | `test/socketKit.ts` 97                    | `test/chatKit.ts` 108                       | `testing/harness.ts`                   | 12 % / 20 %                | no (not alike)    |
| Load test                | `load/` 9 files                           | `load/` 11 files                            | none                                   | helpers 28 % / 24 %        | helper only       |

## 1. Backup, restore and rollback

- **Files:** Bingo `ops/lib/backup.sh` (248 lines), Mini Games `ops/lib/backup.sh` (153), and the
  pull scripts `ops/pull-backups.sh` (37 lines each, 71 % alike) and `ops/pull-backups.ps1` (56 and
  57 lines, 86 % alike). The two games use the same PostgreSQL image digest
  (`postgres:17-alpine@sha256:b0f9560a…`), the same `pg_dump -Fc`, the same age encryption to the
  operator's public key, the same retention (the 14 newest plus the newest of each of 8 older
  weeks) and the same 03:30 timer; only the prefix differs (`sbr` and `smg`).
- **Where they diverge:** Bingo's archive also carries the env file's seed key and recovery key (inside the age encryption), because its sealed secrets and recovery codes cannot be opened without them, and a restore refuses another environment's backup or seed key unless `--force-env` and re-gives the schema to the owner role (`apply_db_roles`). Mini Games has none of that (its backup is the dump and the uploads) and keeps the restore **drill** in the script (a restore into a throw-away PostgreSQL container with a row count); Bingo lists a drill in its script too and rehearses it against the real website installer (`ops/test/real-site-drill.sh`, docs/GO-LIVE.md, prod-readiness.md §7). Bingo's version is the right base: it is the one rehearsed with a backup restored into a fresh server.
- **Cases has none.** Proof: `git grep -i -E "backup|restore|pg_dump"` over Cases' `README.md`,
  `docs/`, `deploy/` and `apps/` finds only route-file restores (`deploy/lib/route.sh`,
  `deploy/test/installer.test.sh`: the previous route restored when a check fails), nothing about a
  database. Its installer creates a local PostgreSQL role or takes a database URL
  (`deploy/install.sh`), so a game with real accounts and results has no backup.
- **What a kit part would look like:** not TypeScript: a small shell library shipped in the kit
  (`ops/backup.sh` with its documented variables: prefix, database, volumes, age recipient, extra
  secrets to keep with it), plus the pull scripts, both parametrised by the game's prefix. It would
  need its own tests (the bash tests the website's installer already has are the model) and a
  place in `files`, which means the kit ships something that is not code a game imports. The
  rule "no install or build script runs on a game's install" is untouched: nothing runs on
  install.
- **Effort:** medium to large (two shells, three games' paths, a rehearsal). **Each game would
  change:** Bingo and Mini Games replace their copies with the kit's and keep only the prefix and
  the secrets list; Cases adopts it (and needs a Docker or a native variant, since its installer
  is native).

## 2. A guarded fetch

- **Files:** Mini Games `apps/server/src/seasons/safeFetch.ts` (99 lines) and
  `integration/safePost.ts` (87): HTTPS only, the configured host the only host allowed, every
  resolved address must be public (a `BlockList` of the private, loopback, link-local,
  carrier-grade and unique-local ranges, IPv4-mapped included), no redirects, a 5 s timeout and a
  64 KiB limit on the answer. **Bingo and Cases have none** (`git grep` for a redirect refusal or
  an address check finds nothing in their server code).
- **Why it matters here:** the kit's `seasonFeedReader` takes "the game's guarded fetch" and the
  HANDBOOK says the kit has no fetch of its own; two of the three games would have to write one.
- **A kit part:** `guardedFetch(options)` in `@seasonal/kit/server`: Node only (`node:dns`,
  `node:net`), no dependency, the rules above as options with those defaults, a development switch
  that the kit's own dev-marker test would catch in a production bundle. Mini Games' tests move
  with it.
- **Effort:** medium (a careful port plus a security pass). **Each game would change:** Mini Games
  replaces `safeFetch.ts`; Bingo and Cases adopt it when they read the season feed or any other
  outside address.

## 3. The session cookie and the CSRF check

- **Files:** Bingo `apps/server/src/auth/sessionPlugin.ts` (155 lines), Mini Games the same path
  (137), Cases `apps/server/src/session.ts` (121). Bingo and Mini Games share 72 % and 80 %.
- **Where they diverge, and which is right:** the cookie's lifetime. Bingo's `setSessionCookie`
  (line 128 on) sets `Max-Age` to the session's absolute length of the running mode (7 days in
  website mode, 30 standalone: `lengths.playerAbsoluteDays`, PR #66, 2026-11-23, prod-readiness.md
  §9). **Mini Games sets a fixed `30 * 24 * 3600` (`sessionPlugin.ts` line 119)** while its own
  sessions last 7 days after a website sign-in (`sessions.ts` lines 10 and 51, `routes/auth.ts`
  line 192): the cookie outlives the session by 23 days. The server decides, so no access follows,
  but it is the very defect Bingo fixed. Cases uses one constant for both (`SESSION_MS`), which is
  consistent. **Bingo's version is right.** Bingo and Mini Games compare a CSRF token in constant time.
- **Cases guards its writes another way, and well** (corrected on 2026-11-25; an earlier version of
  this page and of the audit said it relied on `SameSite=Lax` alone, which was wrong). In
  `apps/server/src/app.ts` (`073f9ad`) the `onRequest` hook `sameSiteWrites` (lines 125-136,
  registered at line 214) refuses any request but GET, HEAD and OPTIONS with 403 when
  `Sec-Fetch-Site` is present and is neither `same-origin` nor `none`, or when the `Origin`'s host
  differs from the `Host` header (`sameOrigin`, lines 110-119, which also decides the socket
  handshake at line 222). A write with no `Origin` passes there. The check needs no token and no
  state, which suits a game behind the website's proxy; the kit's check (v0.21.0, K60) covers at
  least this and refuses a write that carries neither header.
- **A kit part:** framework-free helpers: `sessionCookieOptions({ name, path, secure }, maxAgeSeconds)`
  and `csrfMatches(a, b)` (the constant-time compare the kit already has in `trust.ts`). The
  Fastify hooks stay in each game: the kit has no Fastify and no runtime dependency.
- **Effort:** small. **Each game would change:** a few lines each; Mini Games gets the fixed
  lifetime for free.
- **Recorded for Mini Games, not changed here:** the 30-day cookie in website mode.

## 4. Security headers and the content security policy

- **Files:** Bingo `apps/server/src/http/plugins/securityHeaders.ts` (60), Mini Games (99): 80 %
  and 51 % alike. Cases builds `helmetOptions` in `web.ts` (helmet's defaults, `frame-src` for the
  website's chat, `Referrer-Policy`).
- **Where they diverge:** Bingo's `style-src` is `'self'` in production (an inline allowance only
  for a development page) and `img-src` allows `blob:`; its ZAP baseline went from 2 medium to 0
  after exactly that change (Bingo spec 03 §18, BACKLOG "GOLIVE-HARDENING"). **Mini Games still has
  `style-src 'self' 'unsafe-inline'`**, the medium finding Bingo fixed, but it has two things Bingo
  lacks: a configurable `frame-ancestors` allowlist (`ancestors`) and Trusted Types for the admin
  app. Both send no HSTS, leaving it to the proxy and, in a website install, to the website
  (HANDBOOK, Security). **The right version is Bingo's strictness with Mini Games' configurable
  ancestors.**
- **A kit part:** data, not a plugin: `securityHeaderSet({ ancestors, devPage, admin })` returning
  the CSP directives and the other headers as plain objects, which each game hands to helmet. The
  kit gets no helmet dependency; the HSTS rule is built in as "none".
- **Effort:** medium (the policy needs a ZAP pass in each game). **Each game would change:** Bingo
  and Mini Games replace their plugin's table; Mini Games loses `'unsafe-inline'` (and must move
  its inline styles, which is its own work); Cases replaces `helmetOptions`.

## 5. Health routes

- **Files:** Bingo `routes/health.ts` (43), Mini Games (46), Cases `healthRoutes.ts` (30).
  Bingo and Mini Games are 78 % and 72 % alike: `/healthz` answers `ok`, `/readyz` pings the
  database with a 1.5 s limit and answers 503 `unavailable` otherwise. Cases has other names and
  answers: `/api/health` returns `{ ok, mode, version, db }` and `/api/ready` returns `ready`.
- **Where they diverge:** Bingo limits both per address (`openRouteLimit`, its spec 03 §13); Mini
  Games does not; Mini Games adds the website feed's last success to `/readyz`. **Bingo's is
  right** (a public route that asks the database should be limited), with Mini Games' feed field as
  an option.
- **A kit part:** `readiness(probe, { timeoutMs })` returning `{ code, body }`, about 20 lines, no
  framework. The route names stay each game's (the installers probe them), but the three names
  could be settled at the same time.
- **Effort:** small. **Each game would change:** the body of one function.

## 6. The installer

- **Files:** Bingo `ops/install.sh` (206 lines, 33 files in `ops/`), Mini Games (192, 25), Cases
  `deploy/install.sh` (213, 8 files in `deploy/`). Bingo and Mini Games share 41 % and 48 % (the
  rest is prefixes, volumes and names). Both run the game in Docker Compose behind the website's
  proxy and write a route file into the website's routes folder, restoring the previous file when
  the check fails (`ops/lib/websiteRoute.sh`); Cases installs natively with a local PostgreSQL and
  has the same route-file logic in `deploy/lib/route.sh` with its own shell test
  (`deploy/test/installer.test.sh`).
- **Which is right:** Bingo's, rehearsed against the real website installer in both modes
  (docs/GO-LIVE.md); but Cases' native variant is a real second way to install, so a shared part
  would have to carry both.
- **A kit part:** a shell library for the route-file step only (write, check, reload, restore),
  which all three share in spirit; the rest is each game's.
- **Effort:** large, and the least alike. **Not first.**

## 7. The socket client and its test kit

- **Files:** Bingo `apps/server/test/socketKit.ts` (97), Mini Games `test/chatKit.ts` (108): 12 %
  and 20 % alike, because they do different jobs (a general helper against a chat-specific one).
  Cases has `testing/harness.ts`.
- **Verdict:** not alike enough to share; a kit part would be built from nothing and fit no game.
  **Do not build** until two games need the same helper.

## 8. The load test

- **Files:** Bingo `load/` (9 files: `drawRun`, `drawLatency`, `loadcheck`, …), Mini Games `load/`
  (11: `guessStorm`, `parallelStorm`, …); Cases none. The helpers (`common.mjs`, `measure.mjs`)
  are 28 % and 24 % alike; the scenarios are the games' own.
- **A kit part:** at most the measuring helper (percentiles, a report shape). The scenarios and
  targets stay in the game (HANDBOOK, "Before production").
- **Effort:** small, value low.

## Recommended order

1. **Backup and restore.** Evidence agrees with the brief: two games have near-identical scripts
   (52 % to 72 % alike, the same image digest), so the extraction is low risk, and one game, Cases,
   has none while it holds accounts and results. Take Bingo's script, add Mini Games' drill.
2. **The guarded fetch.** One game has it, two lack it, and the kit's own `seasonFeedReader` is
   waiting for one. Security-relevant and self-contained.
3. **The cookie and CSRF helpers and the security header set**, together, because both close a
   known divergence: Mini Games' 30-day cookie and `'unsafe-inline'`.
4. **Health routes**, with the three route names settled.
5. **The route-file step of the installer**, then the rest only if a fourth game appears.
6. The load helper, and nothing for the socket kit.

Separately, and not a kit matter: report to Mini Games the cookie lifetime in website mode and its
inline-style allowance, which Bingo has already fixed.
