# Shared ops parts: how four projects install, operate and secure their games

An investigation, read-only, no code, 2026-11-26. Nothing in the kit changes with this page; it
recommends, and the owner decides. Read from committed state only:

- **B**, Seasonal Bingo Royale `d7d841e` (master).
- **M**, Seasonal Mini Games `ae8fe40` (master); **M2** is `a483d81` (`feat/kit-0.22`). The branch
  left master before `ae8fe40`, so their CI and browser workflow differences are master's newer
  change. The branch's own ops changes: backup, restore, drill and pull scripts are the kit's.
- **C**, Seasonal Cases `0070e6b` (`kit/v0.17-adoption`).
- **W**, the website, Seasonal Entertainment `10c4619` (master).
- **K**, this kit's working tree.

`B ops/sbr:68` is that file and line at B's commit; "Proposal" marks what no project has.

## a. One admin command with the same verbs

B has `sbr` (verbs `B ops/sbr:305-321`), M has `smg` (`M ops/smg:270-281`, no uninstall, no
loadcheck). C has no single command: `deploy/admin.sh` runs the game's tool, which knows
`admin promote` and `admin reset-2fa` (`C apps/server/src/tools/sc.ts:17-21`); backup, restore and
drill go through `deploy/backup.sh` (`:19-25`), update and status are `deploy/install.sh --update`
and `--check` (`:61-62`), logs are `journalctl` (`:188`). C has no rollback and no uninstall.

### Common frame (B and M)

- Syntax `sbr|smg [--env prod|staging] [--yes] <command>`; global options may stand anywhere
  (`B ops/sbr:286-299`). Also `--email`, `--name`; M adds `--website-id` (`M ops/smg:253-262`).
- Environment: `--env`, else `SBR_ENV` / `SMG_ENV` of `/etc/<p>/install.conf`; `/etc/<p>/<env>.env`
  must exist (`B ops/sbr:301-302`). Compose project `<p>-<env>` (`B ops/lib/common.sh:150-151`).
  C has one: project `seasonal-cases` (`C deploy/lib/common.sh:33`), environment `prod`
  (`C deploy/lib/backup.sh:29`).
- Output: `info` plain, `warn` as `WARNING: …`, `die` as `STOP: …` (`B ops/lib/common.sh:56-61`).
- Exit codes: 0 success; 1 every `die`, including a verb's usage line and "run as root: sudo sbr …"
  (`B ops/sbr:300`) or "no installation found (run ops/install.sh first)"; 2 unknown or missing
  command, after the usage text (`:320`); a failing tool passes its code on (`set -e`, `:22`).
  A global option without its value dies on bash's unbound-variable error (`:291`).

### Verb by verb

| Verb        | Arguments (B)                      | B                  | M                   | C                           |
| ----------- | ---------------------------------- | ------------------ | ------------------- | --------------------------- |
| status      | none                               | `ops/sbr:68-115`   | `ops/smg:67-91`     | `deploy/lib/app.sh:157-172` |
| update      | `<git ref>`; M also `--now`        | `:129-181`         | `:121-143`          | `deploy/install.sh:194-214` |
| confirm     | none                               | `:183-190`         | `:145-152`          | none                        |
| rollback    | none                               | `:192-227`         | `:154-181`          | none                        |
| backup      | none                               | `lib/backup.sh:23` | `lib/backup.sh:25`  | kit script                  |
| restore     | `[--drill] <file> [--identity k]`  | `ops/sbr:235-249`  | `:189-203`          | kit script                  |
| logs        | `[service]`                        | `:312`             | `:277`              | journal                     |
| admin       | `create-super`, `reset-2fa <name>` | `:251-270`         | `:205-240`          | `deploy/admin.sh:19`        |
| maintenance | `on ["reason"]` or `off`           | `:273-284`         | `:242-248` (no why) | none                        |
| loadcheck   | see item i                         | `:315-318`         | none                | none                        |
| uninstall   | `[--purge-backups]`                | item b             | none                | none                        |

**status.** Prints `type:`, `address:`, `image: … (ref …)`, the `compose ps` table,
`health: ready` or `health: NOT READY (sbr logs app)` from `/readyz` inside the container,
`last backup:` (or `none yet`), a warning when the scheduled backup failed, `next backup:`,
`rollback: possible …`, `maintenance:`, `sign-in:`, mail, database roles and the website's proxy,
authorize and feed lines (`B ops/sbr:69-114`). Exits 0 even when not ready. M adds
`rounds: N running` (`M ops/smg:75`) and lacks the failed-backup line. C's `--check` shows
`compose ps` and `ready: …` or a warning, also exit 0.

**update (B, the base).** 1 usage `sbr update <git ref>`; 2 refuse while `rollback.conf` exists
("the last update is not confirmed yet…", `:133`); 3 build `sbr-app:<12 of commit>` (`:135`,
`ops/lib/config.sh:212-238`); 4 refuse a ref older than the database roles (`:138-141`); 5 backup,
"Backup before the update: <file>"; 6 plain `pre-update.dump` via `.partial` (`:145-148`);
7 `rollback.conf` with `PREVIOUS_IMAGE`, `PREVIOUS_REF`, `MIGRATIONS_BEFORE`; 8 keep the old stack
files, check out the ref, install its files (`:154-156`); 9 one-time role conversion keeping
`env.before`, apply roles, one-time recovery key, website refresh (`:159-172`); 10 set image and
ref, `compose up -d`, wait up to 3 minutes (`lib/common.sh:155-165`); 11 prune images no
environment uses; "Updated to <ref> (<image>)." and the confirm-or-rollback hint (`:179-180`).

M differs and is worse: no guard against a second unconfirmed update, so the rollback data is
overwritten; backup and dump are taken before the build, not right before the switch; new stack
files and CLI are never installed (`M ops/smg:121-143`). Its good part is waiting up to 10 minutes
for running rounds unless `--now` (`:101-111`), a game hook. M2 changes none of this, so an update
does not bring `/opt/smg/kit` either (only `install_files` does, `M2 ops/lib/config.sh:126-153`).
C `--update`: backup (only warns when none is set up, dies "…nothing was changed" on failure,
`C deploy/lib/backup.sh:99-115`), fetch, build, settings, `up -d`, ready check.

**confirm** (`B ops/sbr:183-190`). Dies "no update waiting for confirmation"; removes
`pre-update.dump`, `rollback.conf`, `stack`, `env.before`; prunes images; "Update confirmed: the
pre-update dump is deleted; a rollback is no longer possible."

**rollback.** Dies "no update to roll back"; restores data only if the migration count rose; asks
one of two sentences ending "Type yes to go on:" ("stopped; nothing changed" otherwise); backs up;
stops the app and restores in one transaction; puts back `env.before`, image, ref, stack files and
roles; `up -d`; "Rolled back to <image> (ref <ref>)." (`B ops/sbr:194-226`). If the script fails
while the app is stopped, it is started again (`lib/common.sh:32-37`). M writes the old image into
the settings before the database restore and drops the schema outside the restore's transaction
(`M ops/smg:170-176`, `M ops/lib/backup.sh:95-98`); M2 uses the kit's atomic restore
(`M2 ops/lib/backup.sh:73-78`).

**backup.** "Backup written: <file>" (`B ops/sbr:230-233`). B tars dump, uploads, seed and recovery
key, encrypts with age, mode 0640, prunes, clears the failed mark (`B ops/lib/backup.sh:23-55`).
The kit says "backup written: <name>" (`K ops/lib/backup-core.sh:185`); M2 wraps it
(`M2 ops/lib/backup.sh:31-56`), C passes through to it.

**restore, drill.** Usage `sbr restore [--drill] <file> [--identity <age key file>] [--force-env]`.
B refuses another environment's file or seed key, asks, stops, restores database and uploads,
re-applies roles, takes the backup's keys, `up -d`, waits (`B ops/lib/backup.sh:121-145`); the last
line is "the app is ready (…)". Drill: throw-away database, four counts, seed-key check,
"drill passed: …" or "drill FAILED: …" (`:183-202`). The kit asks `[y/N]`, says "not restored",
"restored <file>", compares every table (`K ops/lib/backup-restore.sh:109-162`). Its errors are
`backup: …`, exit 1, also for an unknown command (`K ops/backup.sh:74-94`).

**logs, admin, maintenance.** Logs are `compose logs -f --tail=200`. `create-super` asks e-mail and
name, refuses website installs (`B ops/sbr:260-269`); M adds `promote-super` (`M ops/smg:222-232`).
C's tool prints its usage with exit 1 but prints a refusal such as "there is no account named …"
with exit 0 (`C apps/server/src/tools/sc.ts:43-47`, `adminCommands.ts:36`). B writes the reason to
`/data/maintenance` as an argument (`B ops/sbr:278`).

**Game-specific:** prefix (`SBR_`, `SMG_`, `SC_`), folders `/opt`, `/etc`, `/var/lib`,
`/var/backups/<name>` (`B ops/lib/common.sh:17-21`), project name, services `app`, `postgres`,
`caddy`, database user/name/schema, app port (3000, 3100, 3970) and base path, image name, backup
group, extra secrets, maintenance wording, admin subcommands, status lines, update hooks.

**Kit part.** `ops/admin.sh` plus `ops/lib/admin-*.sh` from `B ops/sbr` and
`B ops/lib/common.sh`, calling `ops/backup.sh`; each game keeps a short wrapper that sets variables
and hook functions (status lines, before and after update, admin, extra usage). Take M's round
wait as a hook. C gains rollback. **Cost:** about 400 lines of shell and 300 of tests. **Risk:**
update and rollback replace live data; one mistake reaches every game, so rehearse per game
(the model is `B ops/test/real-site.sh:131-134` and its operator guide, line 79).

## b. Uninstall of exactly one environment

Only B (`ops/lib/uninstall.sh`, 49 lines; guide `docs/operator-guide.md:173-181`). The website has
its own uninstall for the site (`W deploy/install/lib/manage.sh:95-129`), which removes its units,
containers and recorded firewall rules, and deletes data only with a typed site name.

**B, in order.** Argument: `--purge-backups`, first after the verb; anything else is silently
ignored (`:27`). Prints "This removes the game's environment <env>: its containers, its database and
uploads (volumes), its backup timer, settings and route file. It keeps <the backups in …|no
backups>." (`:28-29`). Asks "Type the environment name (<env>) to remove it:"; a mismatch dies
"nothing removed", exit 1; `--yes` skips (`:30-33`). Then:

1. `compose <env> down --volumes --remove-orphans` (`:34`): containers, the project's networks and
   its named volumes (`pgdata`, `uploads`, `caddy_*`; `B ops/compose.yml:151-160`). The website's
   external network stays (`ops/compose.website.yml:20-23`).
2. Disable `sbr-backup@<env>.timer`, errors ignored (`:35`).
3. Website installs: remove `<routes dir>/bingo.conf`, check and reload nginx; or remove
   `/opt/sbr/routes/bingo.caddy` and the checkout's `deploy/site/routes/bingo.caddy`, validate and
   reload Caddy; a failing check only warns (`B ops/lib/websiteApply.sh:85-104`).
4. Remove `/var/lib/sbr/<env>`; with the flag `/var/backups/sbr/<env>`; then
   `/etc/sbr/<env>.env` (`:37-39`).
5. Only when no other `*.env` is left: all `sbr-app` images; the units `sbr-backup@.service`,
   `sbr-backup@.timer`, `sbr-backup-failed@.service`; `/usr/local/bin/sbr`; `daemon-reload`;
   `/etc/sbr` and `/opt/sbr` with the source checkout (`:40-46`).

Ends "Removed environment <env>. Kept: Docker itself, the group sbr-backup, any user you made for
backups and <kept>." (`:48`). Also kept: the `/var/lib/sbr` parent, packages (age, Docker, its apt
source), the database and Caddy images, the build cache. The route file's name has no environment;
one environment per server makes that safe today (`B ops/install.sh:166-169`).

**What M and C would have to name** (neither has an uninstall):

| Thing      | M                                      | C                                                 |
| ---------- | -------------------------------------- | ------------------------------------------------- |
| Project    | `smg-<env>`                            | `seasonal-cases`                                  |
| Units      | `smg-backup@.service`, `.timer`        | `cases-backup@.*`, `-failed@` (kit prints them)   |
| Folders    | `/etc/smg`, `/opt/smg`, `/var/lib/smg` | `/etc/seasonal-cases`, `/opt/seasonal-cases`      |
| Command    | `/usr/local/bin/smg`                   | none                                              |
| Route file | `mini-games.conf` or `.caddy`          | `cases.conf` or `.caddy`                          |
| Images     | `smg-app:<commit>`                     | `seasonal-cases:<commit>-<mode>`                  |
| Extra      | group `smg-backup`                     | `cases-backup`, journal config and Docker drop-in |

Sources: `M ops/lib/backup.sh:129-151`, `ops/smg:43`, `ops/lib/config.sh:135-175`,
`ops/lib/website.sh:93,110`; `C deploy/lib/common.sh:21-33,63-64`, `deploy/lib/route.sh:30-32`,
`deploy/lib/app.sh:45`, `deploy/lib/backup.sh:17-19,312`. C never prunes images
(`C docs/INSTALL.md:128`).

**Kit part.** `ops/lib/uninstall.sh` from the B file, with the lists above as variables, a hook for
extra paths, an error on unknown options, and a new `sk_route_remove` beside `sk_route_install`
(`K ops/lib/website-route.sh:184` installs only). Add the guide section the handbook requires
(`K docs/HANDBOOK.md:75`). **Cost:** about 90 lines plus 120 of tests. **Risk:** `rm -rf` on a wrong
or empty variable; keep B's `${VAR:?}` guards and test that a second project survives.

## c. Host baseline: firewall, automatic updates, fail2ban

| Project | Firewall                            | Auto updates                  | fail2ban     |
| ------- | ----------------------------------- | ----------------------------- | ------------ |
| B       | guide `:167`; hint `install.sh:145` | guide `:166`                  | guide `:168` |
| M       | guide `:134`; hint `install.sh:132` | guide `:133`                  | guide `:135` |
| M2      | guide `:143` (same text)            | guide `:142`                  | guide `:144` |
| C       | none found                          | none                          | none         |
| W       | installer, only if ufw active       | guide `DEPLOYMENT.md:1151-52` | none         |

Exact commands as written today:

- B and M (`B docs/operator-guide.md:165-168`): `PasswordAuthentication no`, `PermitRootLogin no`;
  `apt install unattended-upgrades`; `ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp;`
  `ufw enable`; `apt install fail2ban`. B also asks for Docker `live-restore` (`:169`).
- W manual (`W docs/DEPLOYMENT.md:1151-1167`): `apt install -y unattended-upgrades ufw git`;
  `dpkg-reconfigure -plow unattended-upgrades`; `ufw default deny incoming`,
  `ufw default allow outgoing`; `ufw allow OpenSSH`; the web and call ports; `ufw enable`.
- W installer (`W deploy/install/lib/firewall.sh:119-145`): `ufw allow <spec>` for each needed port
  no rule covers (`:42-82`), records what it added in `/etc/seasonal/ufw-added`, removes exactly
  those on uninstall (`:154-165`). With ufw inactive or absent it changes nothing and prints the
  ports (`:121-123`). It never enables ufw, installs updates or touches SSH.

**The SSH port:** no project finds it. The games' guides fix 22, W relies on the `OpenSSH` profile;
a server on another port would be locked out by `ufw enable`. Proposal: read every `port` line of
`sshd -T`, add the listening ports of `ss -ltnp` for sshd or ssh.socket and the port of the current
`SSH_CONNECTION`, allow all of them before enabling, and stop when none is found.

**Skipped when present:** covered ufw rules (`firewall.sh:128-133`); installed packages are not
upgraded (`W deploy/install/lib/packages.sh:20-21`); B skips Docker with Compose and present tools
(`B ops/lib/host.sh:57-69`) and `age` (`B ops/lib/backup.sh:209`).

Note: Docker's published ports bypass ufw (`W docs/DEPLOYMENT.md:1170`); the games publish the app
on loopback only (`C ops/compose.yml:37`, `B ops/compose.website-nginx.yml:16`).

**Best:** W's rule logic; nothing exists for the other two. **Kit part:** `ops/lib/host-baseline.sh`:
W's `needed_ports` to `close_ports` with the port list as a variable; new SSH-port detection; install
`unattended-upgrades` and write `/etc/apt/apt.conf.d/20auto-upgrades` (proposal, non-interactive);
install `fail2ban`, with a `jail.local` port line when SSH is not on 22 (proposal, verify on
24.04). Each step opt-in and skipped when present. Whether the kit may enable an inactive ufw is
the owner's decision. **Cost:** 220 lines plus 200 of tests. **Risk:** lockout, and changing a server
that carries other services.

## d. Container hardening

Line numbers are in each game's `ops/compose.yml`; "-" means not set.

**B** (image user 10001, `B Dockerfile:65`):

| Setting              | migrate    | app          | postgres | caddy                  |
| -------------------- | ---------- | ------------ | -------- | ---------------------- |
| `read_only`          | 38         | 65           | -        | -                      |
| `tmpfs`              | -          | 66-67 `/tmp` | -        | -                      |
| `no-new-privileges`  | 39-40      | 68-69        | 105-106  | -                      |
| `cap_drop: ALL`      | 41-42      | 70-71        | -        | -                      |
| `cap_add`            | -          | -            | -        | -                      |
| writable volumes     | -          | 72-73        | 107-108  | 140-141                |
| cpu, memory, no swap | -          | 91-93        | 119-121  | 146-147 (no swap line) |
| network, ports       | 46-47 data | 85-87        | 117-118  | 133-136, 144-145       |

**M** (user 10001, `M Dockerfile:68`; M2 compose unchanged) and **C** (`C Dockerfile:78`):

| Setting             | M app | M postgres | M caddy | C app | C postgres |
| ------------------- | ----- | ---------- | ------- | ----- | ---------- |
| `read_only`         | 39    | -          | -       | 29    | -          |
| `tmpfs /tmp`        | 40-41 | -          | -       | 30-31 | -          |
| `no-new-privileges` | 42-43 | -          | -       | 32-33 | -          |
| `cap_drop: ALL`     | 44-45 | -          | -       | 34-35 | -          |
| `cap_add`           | -     | -          | -       | -     | -          |
| writable volumes    | 46-47 | 71-72      | 100-101 | none  | 54-55      |
| cpu, memory         | 60-61 | 80-81      | 106-107 | 44-45 | 63-64      |
| network, ports      | 57-59 | 78-79      | 93-105  | 36-43 | 61-62      |

All three put PostgreSQL on an `internal` network (`B ops/compose.yml:152-153`, `M :112-113`,
`C :68-69`). B keeps PostgreSQL's capabilities because the image switches user at start (`:103-104`).
B's load generator is also read-only, capability-free (`B ops/lib/loadcheck.sh:84-85`).

**W:** site and its Caddy set none of these (`W deploy/site/docker-compose.yml:17-74`); the site runs
as `node` (`deploy/site/Dockerfile:60`). LiveKit, its Caddy, Redis and egress use host networking
(`deploy/calls/docker-compose.yml:25,48`, `docker-compose.recording.yml:29,65`); limits for LiveKit
(`:37-41`) and egress (`recording.yml:99-105`). The one `cap_add` anywhere: egress `SYS_ADMIN`,
for Chrome's sandbox (`:66-67`). The one-shot `egress-cache` has no network (`:48`).

**Best:** B (adds `no-new-privileges` on PostgreSQL and swap limits). **Kit part:** not a shared
compose file (service names and sizes differ) but a rule and a check: a `@seasonal/kit/testing`
helper over `docker compose config --format json` asserting, for app and migrate, non-root image,
read-only, `/tmp` tmpfs, `no-new-privileges`, `cap_drop ALL`, no `cap_add`; for PostgreSQL
`no-new-privileges`, internal network, no port; limits on every service. M and C add one block each.
Proposal, untested: Caddy with `no-new-privileges`, `cap_drop ALL` and `NET_BIND_SERVICE`.
**Cost:** 80 lines plus tests, about 5 lines per game. **Risk:** an image that fails to start; run it.

## e. Separate database roles

Only B. M's app migrates on start as the one database user (`M ops/smg:14`,
`ops/compose.yml:65-70`); C migrates at server start (`C apps/server/src/db/open.ts:67`) as
`POSTGRES_USER` (`ops/compose.yml:28,51`).

**SQL**, `B ops/lib/db-roles.sql`, run as superuser, one transaction (`:19,105`), idempotent:

- create `sbr_owner`, `sbr_app` with `LOGIN` if missing (`:21-29`); `ALTER ROLE` each to
  `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS` with its password placeholder
  (`:30-33`); `SET search_path = sbr, public` (`:36-37`);
- `REVOKE CREATE, TEMPORARY ON DATABASE … FROM PUBLIC`; `GRANT CONNECT` to both, `GRANT CREATE` to
  the owner (`:41-46`); `REVOKE CREATE ON SCHEMA public FROM PUBLIC` (`:47`);
- `CREATE SCHEMA IF NOT EXISTS sbr AUTHORIZATION sbr_owner`, `ALTER SCHEMA … OWNER`, revoke create
  (`:49-51`); `ALTER … OWNER` for tables, views, sequences (`:59-77`), routines (`:78-88`), enum,
  domain and range types (`:89-102`), skipping extension members. Standalone composite types are
  not covered.

**Grants**, `B apps/server/src/db/roles.ts`: `grantAppRole(pool)` returns false when the role does
not exist (development), else runs (`:23-39`):

```sql
GRANT USAGE ON SCHEMA sbr TO sbr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sbr TO sbr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sbr TO sbr_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sbr.match_events FROM sbr_app; -- also audit_log,
-- settings_versions, league_corrections
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON sbr.schema_migrations FROM sbr_app;
```

**Call sites.** `cli migrate` migrates, then grants (`B apps/server/src/cli.ts:148-152`); the
one-shot `migrate` service runs it as owner before the app (`B ops/compose.yml:30-49,77-78`); the app
has `SBR_MIGRATIONS=check` and blanked superuser and owner secrets (`:59-64`;
`apps/server/src/config/env.ts:47`, `main.ts:24`). The shell side: `write_env` makes the passwords
and both URLs (`B ops/lib/config.sh:71-101`), `db_url` (`:130`), `convert_db_roles` (`:134-142`),
`apply_db_roles` substitutes the passwords in bash and pipes to `psql` (`:148-163`). Called by
install (`ops/install.sh:194`), update (`ops/sbr:159-164`), rollback (`:221`), restore
(`ops/lib/backup.sh:135`). Test: `apps/server/test/dbRoles.integration.test.ts:126-186`.

**A trap for the build.** The kit restores with `--no-owner --no-acl`
(`K ops/lib/backup-restore.sh:90`), then runs the start command (`:125`). With roles, that command
must apply the roles and then `compose up -d`, which runs `migrate` again
(`B ops/lib/backup.sh:133-142`). C and M2 use `compose start app` (`C deploy/lib/backup.sh:43`,
`M2 ops/lib/backup.sh:66`), which would leave the app without rights.

**Bingo-specific:** the names `sbr`, `sbr_owner`, `sbr_app`, the four append-only tables,
`schema_migrations`, the citext remark (`db-roles.sql:34-35`), the pre-roles conversion.
**Kit part:** `ops/lib/db-roles.sql` with schema and role placeholders, `ops/lib/db-roles.sh` from
`config.sh:129-163` (check names, and that passwords are hex), and `grantAppRole(pool, { schema,
role, appendOnly, readOnly })` in `@seasonal/kit/server` with a minimal `query` type. **Cost:** 200
lines plus 180 of tests; each of M and C adds a migrate command, a check mode and compose changes.
**Risk:** an app that cannot write after an update or restore.

## f. An e-mail when the site is down

Only W: optional SMTP questions, account file root-only (`W deploy/install/lib/outage.sh:23-61`),
a watchdog on the host every 2 minutes (`:65-93`, `deploy/site/systemd/seasonal-watchdog.timer:13-15`),
one mail after 2 failures and one on recovery (`deploy/site/watchdog/seasonal-watchdog.sh:143-159`),
the recipient and a test mail from the site's admin page (`:43-47,116-135`). It checks the site's
health and the call service (`:107-114`), no game. It runs on the same host, so a dead server sends
nothing. **Best:** W, the only one. **Recommendation:** the website's watchdog also checks each
embedded game's readiness; no kit part for now. Standalone games stay uncovered, or an outside
monitor covers all. **Cost:** about 60-100 lines in the website. **Needs the website's work.**

## g. A published, signed release image with an SBOM

B's workflow pushes a two-architecture image to GHCR on a version tag and attaches a CycloneDX SBOM
(`B .github/workflows/release.yml:62-89`); signing is off (`if: false`, `:78-85`); the installer
still builds on the server (`B ops/install.sh:135`). The local clone holds no tag, so nothing shows
it has run. M and C build on the server (`M ops/lib/config.sh:165-168`,
`C deploy/lib/app.sh:46-50`) and have no release workflow. C bakes the mode into the client
(`C Dockerfile:30-35`), so it needs one image per mode. **Best:** B's. **Recommendation:** wait until
a game releases to outsiders or a server cannot build; then a reusable workflow with cosign on.
**Cost:** about 100 lines, plus 80 per installer to pull and verify. **Risk:** registry access.

## h. Security scans

Trivy runs in all three games' CI with the same flags and image digest
(`B .github/workflows/ci.yml:41,218-221`, `M :37,140-141`, `C :38,147-150`); C also fails on
development tools in the image (`:140-146`). W has no image scan. The ZAP baseline is in no CI: B ran
it by hand (`B docs/spec/03-security-architecture.md:244,263`), M too
(`M docs/security-pass.md:12`); B's spec asks it before every release (`12-testing-strategy.md:160`).
C has none (`C docs/BACKLOG.md:15`). **Best:** C's image job; M's written triage.
**Recommendation:** kit composite action for the image scan and an `ops/zap-baseline.sh` run before
a release. **Cost:** 40 and 60 lines. **Risk:** one pin update then reaches every game's merge gate.

## i. A load test

B: drivers in `load/` (for example `load/common.mjs:101`) and `sbr loadcheck`, a measured match with
temporary accounts on the live install (`B ops/lib/loadcheck.sh:62-95`). M: `load.yml`, on demand and
on `load/**` pushes, against a runner's stack (`M .github/workflows/load.yml:23-43,78-112`). C: none
(`C docs/BACKLOG.md:15`). The kit has `latencies`, `inBatches`, `watchServer`
(`K src/testing/load.ts:29,42,119`); B pins v0.11.1 (`B apps/server/package.json:39`) and M2's
drivers do not import them. **Best:** B's on-server check for a real server, M's workflow for CI.
**Recommendation:** nothing new in the kit; games adopt the helpers, C writes one driver.
**Cost:** about 200 lines in C. **Risk:** runner numbers are not the server's (`M load.yml:17-18`).

## j. A privacy data list

Only B: every stored item by table with purpose, duration and deletion, both modes, server log and
backups (`B docs/PRIVACY-DATA.md:5-54`). C has a privacy page, export, deletion and 14-day logs but
no list (`C docs/BACKLOG.md:23`, `docs/DECISIONS.md:222-229`). M describes deletion in its spec
(`M docs/spec/05-security-threat-model.md:28`); no list found. W publishes a privacy page
(`W server/src/info/seed/privacy.md:10-231`). The handbook already requires the list
(`K docs/HANDBOOK.md:126`). **Best:** B's. **Recommendation:** a template and a test helper that
fails when a migrated table has no row. **Cost:** 30 lines of template, 80 of helper and tests.
**Risk:** a table check misses new columns.

## k. A nightly browser run

M and C run the extra browsers at 02:30 UTC (`M .github/workflows/browsers.yml:18-19`,
`C :16-18`, C also Chromium at phone size, `:44-45`). B has no nightly run: Chromium, Firefox and
mobile WebKit run on every pull request and master push (`B .github/workflows/ci.yml:117-195`).
**Best:** B finds failures earliest, M and C wait less per merge. **Recommendation:** no kit part;
write the choice into the handbook. **Cost:** a few lines of docs.

## Further items of this kind

- **A failed backup shows:** B marks it for `status` (`B ops/lib/backup.sh:224-233`,
  `ops/sbr:85-87`); the kit's unit only logs (`K ops/lib/backup-core.sh:196`); M2 writes no failure
  unit (`M2 ops/lib/backup.sh:95-116`). Put B's mark into the kit with part a.
- **Kit scripts copied incompletely:** since v0.25.0 `backup.sh` loads `lib/`
  (`K ops/backup.sh:49-52`), but C copies the one file (`C deploy/lib/backup.sh:49-59`) and M2 three
  files without `lib/` (`M2 ops/lib/config.sh:148-152`). Both pin v0.22.0
  (`C package.json:35`, `M2 apps/server/package.json:38`): fix before moving the pin.
- **Log retention:** B and M rotate by size (`B ops/compose.yml:21-25`, `M :24-28`), C keeps 14 days
  in its own journal (`C ops/compose.journal.yml:13-27`). Relevant to item j.
- **Dependency and secret scans** repeat in each CI (`B ci.yml:64-105`, which adds a licence
  check; `C :76-105`; `W .github/workflows/ci.yml:242-271`): a candidate beside item h.
- **Backup pulling:** W limits its pull account in `sshd` (`W docs/DEPLOYMENT.md:778-786`), stricter
  than a plain group member (`C docs/INSTALL.md:146-147`).

## Items f to k: for the owner

| Item | Recommendation                    | Cost (lines)      | The owner decides                       |
| ---- | --------------------------------- | ----------------- | --------------------------------------- |
| f    | Website watchdog checks the games | 60-100, website   | Ask the website; outside monitor or not |
| g    | Later, with signing on            | 100 + 80 per game | When; public or private images          |
| h    | Shared image scan, ZAP script     | 40 + 60           | Gate or report; add the website         |
| i    | Adopt helpers; one driver for C   | about 200 in C    | Targets, and whether C needs it now     |
| j    | Template and table check          | about 110         | Required before production for all      |
| k    | No kit part                       | a few, docs       | Every pull request or nightly           |
