# Operations: backups, restore and the drill

How a game wires the kit's `ops/backup.sh` (since v0.21.0, DECISIONS K61). The script is shipped in
the package (`node_modules/@seasonal/kit/ops/backup.sh`), changes nothing on install, and runs only
when the game's server runs it. Since v0.25.0 its functions are in `ops/lib/` beside it (K71), so a
game calls the script from the package, or copies the kit's whole `ops/` folder, keeping its
layout. It is Bingo Royale's rehearsed backup, made to take its settings
from variables, with Mini Games' restore drill; what stays in a game is listed at the end.

**Copying it elsewhere** (out of an image to the server, say): copy the kit's whole `ops/` folder,
keeping its layout. `ops/backup.sh` loads `ops/lib/backup-core.sh` and `ops/lib/backup-restore.sh`
from beside itself, so a copy of `backup.sh` alone fails.

## What a backup is

One file, `<prefix>-<env>-<UTC time>.tar.age`, written into `SK_BACKUP_DIR` (mode 0640, folder 0750,
group `SK_BACKUP_GROUP` if set): a tar encrypted with [age](https://age-encryption.org) to the
operator's **public** key, so the server never holds the key that opens it. It holds, and only holds:

- `db.dump`: `pg_dump -Fc` of the database;
- `vol-<name>.tar`: one tar per Docker volume the game names (its uploads), without the live-state
  files the game excludes (a maintenance flag, a feed's status: a restore must not bring them back);
- `secret-<file>`: the secret files the game names (its seed and recovery keys), because a database
  restored without them cannot open what it sealed; they are inside the encryption and are never
  printed;
- `manifest.txt`: the prefix, the environment, the time and the names of the parts. No secret.

It is written as `.partial` and renamed when complete. Afterwards the folder is pruned: the 14
newest are kept, and of the older ones the newest of each of 8 weeks. Another environment's files
(another `<env>` in the name) are never touched.

## The settings

Every setting is an environment variable; put them in one env file, mode 0600, read by the timer.

| Variable                    | Needed for        | Meaning                                                                                                                                                |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SK_BACKUP_PREFIX`          | every command     | The game's prefix in file names, e.g. `sbr`. Letters, digits, `-` and `_`.                                                                             |
| `SK_BACKUP_ENV`             | every command     | The environment, default `prod`. A restore of another environment's backup is refused.                                                                 |
| `SK_BACKUP_DIR`             | backup            | Where the backups land, e.g. `/var/backups/sbr/prod`.                                                                                                  |
| `SK_BACKUP_AGE_RECIPIENT`   | backup            | The operator's age **public** key (`age1…`).                                                                                                           |
| `SK_BACKUP_DB_CONTAINER`    | the database      | The Docker container that runs PostgreSQL; the client commands run inside it. Use this or `SK_BACKUP_DB_URL`.                                          |
| `SK_BACKUP_DB_USER`         | with a container  | The database user for `pg_dump` and `psql`.                                                                                                            |
| `SK_BACKUP_DB_NAME`         | with a container  | The database name.                                                                                                                                     |
| `SK_BACKUP_DB_URL`          | the database      | A connection string for clients on the host (a game's `DATABASE_URL`). A password in it is passed on as `PGPASSWORD`, never on a command line (K75).   |
| `SK_BACKUP_DB_SCHEMA`       | restore, optional | A schema to drop before the restore, inside the same transaction (Bingo's `sbr`); without it `pg_restore --clean --if-exists` drops what it recreates. |
| `SK_BACKUP_VOLUMES`         | optional          | Docker volume names to include, separated by spaces.                                                                                                   |
| `SK_BACKUP_VOLUME_EXCLUDES` | optional          | Live-state files to leave out of a volume and to leave alone on restore, as `./name`, separated by spaces.                                             |
| `SK_BACKUP_HELPER_IMAGE`    | with volumes      | An image with `sh`, `tar` and `find`, pinned by digest (the game's own image will do); it reads and refills the volumes.                               |
| `SK_BACKUP_SECRET_FILES`    | optional          | Files kept inside the encryption (the seed and recovery keys), separated by spaces. Only their names are ever said.                                    |
| `SK_BACKUP_GROUP`           | optional          | A group that may read the backups, so a user in it can pull them without root.                                                                         |
| `SK_BACKUP_KEEP_DAILY`      | optional          | How many of the newest to keep, default 14.                                                                                                            |
| `SK_BACKUP_KEEP_WEEKS`      | optional          | How many older weeks keep their newest file, default 8.                                                                                                |
| `SK_BACKUP_STOP_CMD`        | restore, optional | A command that stops the app before the restore (run with `bash -c`).                                                                                  |
| `SK_BACKUP_START_CMD`       | restore, optional | A command that starts it again.                                                                                                                        |
| `SK_BACKUP_PG_IMAGE`        | drill             | The PostgreSQL image for the throw-away container, pinned by digest, the same as production's.                                                         |
| `SK_BACKUP_ENV_FILE`        | print-units       | The env file path the timer's service reads.                                                                                                           |
| `SK_BACKUP_SOURCE_ONLY`     | tests             | `1` sources the script for its functions instead of running it.                                                                                        |

## Wiring it

1. Install `age` on the server and generate the operator's key **on the operator's own computer**
   (`age-keygen -o key.txt`); give the server only the public key (`age-keygen -y key.txt`).
2. Write the env file with the settings above.
3. Print the units and install them, then enable the timer. Call the script through the package's
   link, `node_modules/@seasonal/kit/ops/backup.sh print-units`: the service runs it by the path
   you called, and a path inside the pnpm store is refused, because it changes with every kit
   update. It writes a `…-backup@.service`, a `…-backup-failed@.service` (it logs
   a failed backup) and a `…-backup@.timer` for 03:30. Put them in `/etc/systemd/system/`, then
   `systemctl daemon-reload` and `systemctl enable --now <prefix>-backup@<env>.timer`.
4. Run one by hand first: `ops/backup.sh backup`.

## Pulling the backups to your own computer

The files stay encrypted. On Linux or macOS:
`ops/pull-backups.sh <user@server> <remote folder> <prefix> [target]` (rsync over SSH; a cut-off
copy never counts). On Windows:
`powershell -ExecutionPolicy Bypass -File ops\pull-backups.ps1 -Server <user@server> -RemoteDir <remote folder> -Prefix <prefix>`
(scp; a file counts only when its size equals the server's). The SSH user needs only the backup
group, no root.

## The drill: does the last backup restore?

`ops/backup.sh drill <file> --identity key.txt` starts a **throw-away** PostgreSQL container from
`SK_BACKUP_PG_IMAGE`, restores the dump into it, and for every table compares the rows it holds with
the rows the dump carries (counted in the dump's own `COPY` blocks, so a database that has moved on
does not matter). It prints each table's count and "drill passed", or fails if one differs. It
removes its container. Run it after the first backup, and now and then (monthly) on the newest.

`backup` needs Linux: in Git Bash on Windows its `install -m` and `chmod` calls fail. A drill on a
Windows computer, backup included, runs in a Linux container.

## Restoring

`ops/backup.sh restore <file> --identity key.txt [--secrets-to <folder>] [--force-env] [--yes]`

- It refuses a file of another prefix or environment, by its name and by its manifest, unless
  `--force-env`.
- It refuses to unpack an archive with a member it does not know.
- It asks before it replaces live data (`--yes` skips the question).
- It runs `SK_BACKUP_STOP_CMD`, replaces the database **in one transaction** (the live data goes only
  when the restore succeeded), refills the volumes (leaving the excluded live-state files as they
  are), puts the secret files into `--secrets-to` (a file that differs from the one there stops it
  unless `--force-env`), and runs `SK_BACKUP_START_CMD`.

## What is never done

No command prints a secret, a key, or the content of a dump: only file names, table names and
counts. The restore trusts only names it knows (`db.dump`, `manifest.txt`, `vol-…`, `secret-…`).
The private key is never on the server. The kit's tests (`ops/test/backup.test.sh`, CI job `ops`)
check each of these on a real PostgreSQL container, with the same image digest the games use.

## What stays in each game

Its compose files and env file, the seed-key check after a drill (Bingo's `check-seed-key`), the
database roles it re-grants after a restore (Bingo's `apply_db_roles`), and the words of its operator
guide. A game that needs a step the script does not have runs it in `SK_BACKUP_STOP_CMD` or
`SK_BACKUP_START_CMD`, or after the restore.

## The website's route file (since v0.25.0, K72)

`ops/lib/website-route.sh` is the installer's route-file step of a website install. A game's
installer sources it from the package, sets the variables and calls `sk_route_install`; or prints
the content with `sk_route_nginx` / `sk_route_caddy`. It writes only the game's own file, mode
0600 (it holds the proxy secret), into the folder the website's proxy already imports, checks the
proxy, puts the earlier file back when the proxy refuses it, and reloads. Every value is checked
first, so none can add a directive; the secret is never printed.

| Variable                    | Meaning                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `SK_ROUTE_GAME`             | The game's slug at the website, e.g. `mini-games`.                                                                |
| `SK_ROUTE_BASE`             | The path it is served under, e.g. `/games/mini-games`.                                                            |
| `SK_ROUTE_SECRET_HEADER`    | The header that carries the proxy secret, e.g. `X-Smg-Proxy-Secret`.                                              |
| `SK_ROUTE_SECRET`           | The proxy secret (letters, digits and `._~+/=-`); read it from the env file, never type it on a command line.     |
| `SK_ROUTE_APP`              | The app as the proxy reaches it, `host:port`.                                                                     |
| `SK_ROUTE_WEBSITE`          | The website as the proxy reaches it, `host:port`.                                                                 |
| `SK_ROUTE_AUTHORIZE`        | Optional: the website's authorize path, default `/api/games/<game>/authorize`.                                    |
| `SK_ROUTE_IDENTITY_HEADERS` | Optional: the identity headers passed on, default the website's seven.                                            |
| `SK_ROUTE_MODE`             | `nginx` or `caddy` (for `sk_route_install`).                                                                      |
| `SK_ROUTE_FILE`             | The route file's absolute path, ending `.conf` or `.caddy`.                                                       |
| `SK_ROUTE_CHECK_CMD`        | The proxy's own check, e.g. `nginx -t -q`, or `docker exec <caddy> caddy validate --config /etc/caddy/Caddyfile`. |
| `SK_ROUTE_RELOAD_CMD`       | The proxy's reload, e.g. `systemctl reload nginx`.                                                                |

The game keeps its end-of-install check through the website and its own compose names.

## The operator's address

One contact address for a server, used by every Seasonal installer for the TLS certificates (ACME)
and as the operator's contact (K85). It is never in a repository.

- **The file:** `/etc/seasonal/operator.env`, owned by root, mode 0644 (the address is no secret).
- **The key:** `SK_OPERATOR_EMAIL=<address>`, a plain address. Other lines are left as they are.
- **Who reads it:** an installer that sources `ops/lib/operator.sh` and calls
  `email=$(sk_operator_email "$EMAIL_FLAG")`. The website's installer may read the same file; that
  is the website's own decision.

`sk_operator_email` prints the address:

1. one passed to it (the installer's `--email`) wins, and is written to the file if the file has
   none;
2. else the file's;
3. else, at a terminal, it asks once and writes the answer;
4. else it stops and names the file and the key.

It says "using <address> from <file>" and no other line with an address.

| Variable          | Needed for | Meaning                                                                 |
| ----------------- | ---------- | ----------------------------------------------------------------------- |
| `SK_OPERATOR_DIR` | optional   | The folder holding `operator.env`, default `/etc/seasonal` (for tests). |

## The admin command

`ops/lib/admin.sh` gives every game's own command (`sbr`, `smg`, …) the same verbs with the same
meaning and output (K87). The game's command sets the settings, defines its hooks, sources the
library and calls it:

```sh
#!/usr/bin/env bash
SK_ADMIN_NAME=game SK_ADMIN_PREFIX=gm
SK_ADMIN_ETC=/etc/game SK_ADMIN_STATE=/var/lib/game SK_ADMIN_ROOT=/opt/game
SK_ADMIN_IMAGE_REPO=game-app SK_ADMIN_IMAGE_KEY=GAME_IMAGE SK_ADMIN_REF_KEY=GAME_REF
game_compose() { local env=$1; shift; docker compose -p "game-$env" --env-file "/etc/game/$env.env" "$@"; }
game_backup_settings() { export SK_BACKUP_PREFIX=gm SK_BACKUP_ENV=$1 …; }
source /opt/game/kit/ops/lib/admin.sh
sk_admin_main "$@"
```

Copy the kit's whole `ops/` folder, keeping its layout.

| Command                         | What it does                                                                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`                        | Environment, image and ref, containers, `/readyz`, last and next backup, a failed backup, a pending rollback. Exit 0 also when not ready.                                                                                                                        |
| `update <git ref>`              | Builds the ref, backs up, keeps a plain dump, installs the new stack files, starts, waits for `/readyz`. Refused while the last update is unconfirmed.                                                                                                           |
| `confirm`                       | Deletes the dump and the rollback data.                                                                                                                                                                                                                          |
| `rollback`                      | Asks, backs up, restores the dump in one transaction only if the schema migrated, puts back image, ref, settings and stack files.                                                                                                                                |
| `backup`, `restore [--drill] f` | `ops/backup.sh` with the game's settings.                                                                                                                                                                                                                        |
| `logs [service]`                | Follows the logs.                                                                                                                                                                                                                                                |
| `uninstall [--purge-backups]`   | Removes one environment: containers, volumes, backup timer, route file, rollback data, settings. Asks for the environment's name. With the last environment also the images, units, command and folders. **The backups stay** unless `--purge-backups` is given. |

`--env <name>` and `--yes` may stand anywhere. Messages: plain lines, `WARNING: …`, and `STOP: …`
with exit 1; an unknown command prints the usage and exits 2. Root only. Any other command runs the
game's `game_cmd_<word> <env> …`.

| Setting                | Needed   | Meaning                                                                                |
| ---------------------- | -------- | -------------------------------------------------------------------------------------- |
| `SK_ADMIN_NAME`        | yes      | The command's name, in messages.                                                       |
| `SK_ADMIN_PREFIX`      | yes      | The backup units' prefix (`<prefix>-backup@<env>.timer`, as `print-units` names them). |
| `SK_ADMIN_ETC`         | yes      | The settings folder: `<env>.env` per environment and `install.conf`.                   |
| `SK_ADMIN_STATE`       | yes      | Per environment: the rollback data.                                                    |
| `SK_ADMIN_ROOT`        | yes      | The installed files.                                                                   |
| `SK_ADMIN_IMAGE_REPO`  | yes      | The image's repository name; unused images of it are removed.                          |
| `SK_ADMIN_IMAGE_KEY`   | yes      | The key of `<env>.env` naming the running image.                                       |
| `SK_ADMIN_REF_KEY`     | yes      | The key of `install.conf` naming the installed git ref.                                |
| `SK_ADMIN_DEFAULT_ENV` | optional | The environment without `--env`.                                                       |
| `SK_ADMIN_APP_SERVICE` | optional | The app's Compose service, default `app`.                                              |
| `SK_ADMIN_READY_URL`   | optional | Default `http://127.0.0.1:3000/readyz`, asked inside the app's container.              |
| `SK_ADMIN_WAIT_TRIES`  | optional | Two-second tries for the app to be ready, default 90.                                  |
| `SK_ADMIN_STACK_FILES` | optional | Files under the root an update replaces; kept for a rollback.                          |
| `SK_ADMIN_BACKUP`      | optional | The backup script, default `../backup.sh` beside the library.                          |
| `SK_ADMIN_UNIT_DIR`    | optional | Default `/etc/systemd/system`.                                                         |
| `SK_ADMIN_COMMAND`     | optional | The command's link to remove, default `/usr/local/bin/<name>`.                         |

| Hook                              | Needed for              | What it does                                                                                                                                 |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `game_compose <env> …`            | every command           | Docker Compose for the environment.                                                                                                          |
| `game_backup_settings <env>`      | every command           | Exports the `SK_BACKUP_*` settings. The start command of a restore must run `up -d`, not `start`, where a service re-applies database roles. |
| `game_build <env> <ref>`          | update                  | Builds the image and sets `SK_ADMIN_NEW_IMAGE`.                                                                                              |
| `game_migrations <env>`           | update, rollback        | Prints how many migrations the database holds.                                                                                               |
| `game_before_update <env> <ref>`  | optional                | Before the backup: wait for running rounds, or refuse.                                                                                       |
| `game_install_stack <env> <ref>`  | optional                | Installs the ref's stack files and command.                                                                                                  |
| `game_before_start <env> <ref>`   | optional                | Before the new image starts; may keep the old settings as `<state>/<env>/env.before`.                                                        |
| `game_after_restore <env> <0\|1>` | optional                | In a rollback, before the start (1: the database was restored).                                                                              |
| `game_status <env>`               | optional                | The game's own status lines.                                                                                                                 |
| `game_usage`                      | optional                | The game's own usage lines.                                                                                                                  |
| `game_route_settings <env>`       | uninstall, website mode | Sets `SK_ROUTE_MODE`, `_FILE`, `_CHECK_CMD`, `_RELOAD_CMD`; no file, no route.                                                               |
| `game_uninstall_extra <env>`      | optional                | Removes what only the game knows.                                                                                                            |

## The host baseline

`ops/lib/host-baseline.sh` gives a **standalone** game's server (Ubuntu 24.04) its basic security
(K88). The installer sources it and calls `sk_host_baseline standalone`, or `website`, where it
says that the website's installer owns the host and changes nothing.

It only adds, never removes, and skips each step already in place with a sentence:

1. **Firewall (ufw):** allows the ports SSH really uses (every `port` of `sshd -T`, and the port of
   the operator's own connection), 80 and 443, **then** turns ufw on. Without an SSH port, or if a
   rule cannot be added, ufw is not turned on.
2. **Automatic security updates:** installs `unattended-upgrades` and, if they are off, writes
   `/etc/apt/apt.conf.d/52seasonal-auto-upgrades`.
3. **fail2ban:** installs it and writes the SSH jail `/etc/fail2ban/jail.d/seasonal-sshd.conf` for
   those ports.

It **never changes the SSH configuration**: it reports whether root and password login are allowed,
with advice. A firewall at the hosting provider must allow the same ports. Ports a game publishes
through Docker bypass ufw, so a game publishes its app on loopback only.

| Variable           | Needed for | Meaning                                         |
| ------------------ | ---------- | ----------------------------------------------- |
| `SK_HOST_APT_CONF` | optional   | Default `/etc/apt/apt.conf.d` (for the tests).  |
| `SK_HOST_JAIL_DIR` | optional   | Default `/etc/fail2ban/jail.d` (for the tests). |
