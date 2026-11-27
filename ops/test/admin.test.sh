#!/usr/bin/env bash
# @file   ops/test/admin.test.sh
# @brief  The shared admin command: its verbs, the update and rollback of data, and an uninstall
#         that removes one environment and nothing else (K87).
#
# Responsibility: a stand-in game command in a temporary folder uses ops/lib/admin.sh; `docker`,
#                 `systemctl`, `sleep`, `age` and the PostgreSQL clients on the PATH are stand-ins
#                 that record their calls, so nothing real runs. Proves: root and the environment
#                 are required, exit codes and the game's own verbs; status healthy and not;
#                 backup and restore through the kit's script; update with its refusals, confirm,
#                 rollback with and without a schema change (stack files put back by renaming, one
#                 not kept left), secret files written for a backup and before a restore compares
#                 them, the app started again when a restore fails; uninstall asking for the name, refusing unknown options, keeping backups,
#                 the other environment and the game until its last one goes. Needs Linux as root,
#                 no Docker, no database. Run: sudo bash ops/test/admin.test.sh (CI job `ops`).
#                 The folder is removed.
set -euo pipefail

kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
chmod 0755 "$work"
# A copy anyone may read: the check without root runs it, and a CI checkout lies in a home
# folder that other users cannot enter.
cp -r "$kit/ops" "$work/ops"
chmod -R a+rX "$work/ops"
export W=$work LOG=$work/calls

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }
# said <what> <text>: the last call's output holds the text.
said() { if grep -qF -e "$2" "$work/out"; then ok "$1"; else bad "$1: $(tr '\n' '|' <"$work/out")"; fi; }
called() { if grep -qF -e "$2" "$LOG"; then ok "$1"; else bad "$1: no call [$2]"; fi; }
uncalled() { if grep -qF -e "$2" "$LOG"; then bad "$1: [$2] was called"; else ok "$1"; fi; }
there() { if [[ -e $2 ]]; then ok "$1"; else bad "$1: $2 is gone"; fi; }
gone() { if [[ -e $2 ]]; then bad "$1: $2 is there"; else ok "$1"; fi; }

# The stand-ins. A file named fail.<what> in $W makes that tool fail.
mkdir "$work/bin"
stub() {
  {
    printf '#!/usr/bin/env bash\n'
    cat
  } >"$work/bin/$1"
  chmod 0755 "$work/bin/$1"
}
stub docker <<'EOF'
printf 'docker %s\n' "$*" >>"$LOG"
case "$*" in
  'image ls'*) cat "$W/images" 2>/dev/null ;;
  'image rm '*) sed -i "\|^${3}\$|d" "$W/images" ;;
  *' ps --format'*) printf 'SERVICE STATUS\napp Up\n' ;;
  *' exec -T app wget '*) [[ ! -e $W/fail.ready ]] ;;
  'exec '*' pg_isready '*) [[ ! -e $W/fail.pg ]] ;;
esac
EOF
stub systemctl <<'EOF'
printf 'systemctl %s\n' "$*" >>"$LOG"
case $1 in
  is-failed) [[ -e $W/fail.unit ]] ;;
  show) echo 'Fri 2026-11-27 03:30:00 UTC' ;;
esac
EOF
stub sleep <<'EOF'
:
EOF
stub age <<'EOF'
if [[ $1 == -d ]]; then cat "${@: -1}"; else cat; fi
EOF
stub pg_dump <<'EOF'
printf 'pg_dump\n' >>"$LOG"
printf 'dump'
EOF
stub pg_restore <<'EOF'
printf 'pg_restore\n' >>"$LOG"
[[ ! -e $W/fail.restore ]] || exit 1
cat >/dev/null
printf 'SELECT 1;\n'
EOF
stub psql <<'EOF'
cat >/dev/null
EOF
export PATH="$work/bin:$PATH"

# The stand-in game.
cat >"$work/game" <<EOF
#!/usr/bin/env bash
SK_ADMIN_NAME=game
SK_ADMIN_PREFIX=gm
SK_ADMIN_ETC=$work/srv/etc
SK_ADMIN_STATE=$work/srv/state
SK_ADMIN_ROOT=\${ROOT_OVERRIDE:-$work/srv/opt}
SK_ADMIN_IMAGE_REPO=gm-app
SK_ADMIN_IMAGE_KEY=GM_IMAGE
SK_ADMIN_REF_KEY=GM_REF
SK_ADMIN_DEFAULT_ENV=prod
SK_ADMIN_UNIT_DIR=$work/srv/units
SK_ADMIN_COMMAND=$work/srv/bin-game
SK_ADMIN_STACK_FILES=\${STACK_OVERRIDE:-compose.yml}
SK_ADMIN_WAIT_TRIES=2
game_compose() { local env=\$1; shift; docker compose -p "gm-\$env" "\$@"; }
game_backup_settings() {
  export SK_BACKUP_PREFIX=gm SK_BACKUP_ENV=\$1 SK_BACKUP_DIR=$work/srv/backups/\$1
  export SK_BACKUP_AGE_RECIPIENT=age1standin SK_BACKUP_DB_URL=postgresql://gm@db/gm
  export SK_BACKUP_PG_IMAGE=pg-stand-in
  export SK_BACKUP_START_CMD='echo app-started >>"\$LOG"'
  # The secret file the backup carries, and, when the test asks for it, where it is restored to.
  [[ ! -e \$W/secrets ]] || export SK_BACKUP_SECRET_FILES=\$W/secrets/seed.key
  [[ ! -e \$W/restore-secrets ]] || SK_ADMIN_SECRETS_DIR=\$W/restore-to/\$1
}
# Writes the secret files as a game does: its current key where a restore compares, when asked.
game_backup_secrets() {
  echo 'made for a backup' >"\$W/made-secret"
  [[ ! -e \$W/current-key ]] || install -D -m 0600 "\$W/current-key" "\$SK_ADMIN_SECRETS_DIR/seed.key"
}
game_build() { printf 'build %s\n' "\$2" >>"\$LOG"; SK_ADMIN_NEW_IMAGE=gm-app:\$2; echo "gm-app:\$2" >>"\$W/images"; }
game_migrations() { cat "\$W/migrations"; }
game_install_stack() { echo "stack of \$2" >"\$SK_ADMIN_ROOT/compose.yml"; }
game_status() { echo "players:     none (\$1)"; }
game_usage() { echo '  hello                          the game'\\''s own verb'; }
game_cmd_hello() { echo "hello \$*"; }
game_route_settings() {
  SK_ROUTE_MODE=nginx SK_ROUTE_FILE=$work/srv/routes/gm-\$1.conf
  SK_ROUTE_CHECK_CMD='[[ ! -e \$W/fail.nginx ]]' SK_ROUTE_RELOAD_CMD='echo proxy-reloaded >>"\$LOG"'
}
source "$work/ops/lib/admin.sh"
sk_admin_main "\$@"
EOF

# A fresh server with the environments prod and staging.
fresh() {
  rm -rf "$work/srv" "$work"/fail.* "$LOG"
  mkdir -p "$work/srv/etc" "$work/srv/state" "$work/srv/opt" "$work/srv/units" "$work/srv/routes"
  local env
  for env in prod staging; do
    printf "GM_IMAGE='gm-app:v1'\nSECRET='stays'\n" >"$work/srv/etc/$env.env"
    mkdir -p "$work/srv/backups/$env" "$work/srv/state/$env"
    : >"$work/srv/backups/$env/gm-$env-20261101T030000Z.tar.age"
    : >"$work/srv/routes/gm-$env.conf"
  done
  printf "GM_REF='v1'\n" >"$work/srv/etc/install.conf"
  echo 'stack of v1' >"$work/srv/opt/compose.yml"
  : >"$work/srv/units/gm-backup@.timer"
  : >"$work/srv/bin-game"
  echo 'gm-app:v1' >"$work/images"
  echo 3 >"$work/migrations"
  : >"$LOG"
}
# game <args…>: its output in $work/out, its status in $status. `answer` is typed at a question.
game() {
  status=0
  printf '%s\n' "${answer:-}" | bash "$work/game" "$@" >"$work/out" 2>&1 || status=$?
}

fresh
status=0
setpriv --reuid=65534 --regid=65534 --clear-groups bash "$work/game" status >"$work/out" 2>&1 || status=$?
equals 'not as root: stops' "$status" 1
said 'saying how' 'STOP: run as root: sudo game status'
game --env nowhere status
equals 'an unknown environment stops' "$status" 1
game --env ../etc status
equals 'a name that is a path stops' "$status" 1
game
equals 'no command: the usage, exit 2' "$status" 2
game wipe
equals 'an unknown command: exit 2' "$status" 2
said 'the usage lists the verbs' 'uninstall [--purge-backups]'
said 'and the game'\''s own' "the game's own verb"
game hello you
said 'a game verb runs with the environment' 'hello prod you'
ROOT_OVERRIDE=/ game status
said 'a folder that is the whole disk is refused' 'STOP: SK_ADMIN_ROOT is not a folder of its own'

game status
equals 'status ends well' "$status" 0
for line in 'environment: prod' 'image:       gm-app:v1 (ref v1)' 'health:      ready' \
  'gm-prod-20261101T030000Z.tar.age' 'next backup: Fri 2026-11-27' 'players:     none (prod)'; do
  said "status says: $line" "$line"
done
touch "$work/fail.ready" "$work/fail.unit"
game status
equals 'not ready: still exit 0' "$status" 0
said 'and says so' 'health:      NOT READY (game logs app)'
said 'a failed backup is warned of' 'WARNING: the scheduled backup FAILED'

fresh
game logs app
called 'logs follows the service' 'compose -p gm-prod logs -f --tail=200 app'
game backup
said 'backup writes through the kit' 'backup written: gm-prod-'
game restore --nonsense x
equals 'restore refuses an unknown option' "$status" 1
backup=$(find "$work/srv/backups/prod" -name '*.tar.age' -size +0 | head -n 1)
game --yes restore "$backup" --identity "$work/game"
said 'restore goes through the kit' "restored $(basename "$backup")"
# The drill's throw-away database is ready only over TCP: while a new one is being set up, its
# first server answers on the socket alone (v0.39.0). The stand-ins restore no table.
: >"$LOG"
game restore --drill "$backup" --identity "$work/game"
called 'the drill asks over TCP' 'pg_isready -h 127.0.0.1 -U drill -d drill'
touch "$work/fail.pg"
: >"$LOG"
game restore --drill "$backup" --identity "$work/game"
said 'a database that never answers ends the drill' 'the throw-away database did not start within 60 s'
uncalled 'before anything is restored into it' 'pg_restore -U drill'
rm "$work/fail.pg"

# The backup's secret files: only named without the setting, put there with it (v0.34.0).
fresh
mkdir -p "$work/secrets"
echo 'seed-test-only' >"$work/secrets/seed.key"
game backup
backup=$(find "$work/srv/backups/prod" -name '*.tar.age' -size +0 | head -n 1)
game --yes restore "$backup" --identity "$work/game"
said 'without the setting the secret is only named' 'pass --secrets-to <folder> to restore it'
equals 'and nothing is written' "$([[ -e $work/restore-to ]] && echo written)" ''
touch "$work/restore-secrets"
game --yes restore "$backup" --identity "$work/game"
said 'with it the secret is restored' "the secret file seed.key is restored to $work/restore-to/prod"
equals 'byte for byte' "$(cat "$work/restore-to/prod/seed.key")" 'seed-test-only'
echo 'another key' >"$work/restore-to/prod/seed.key"
: >"$LOG"
game --yes restore "$backup" --identity "$work/game"
equals 'a differing secret stops the restore' "$status" 1
uncalled 'before the data is touched' 'pg_restore'
game --yes restore "$backup" --identity "$work/game" --force-env
equals 'forced, it is replaced' "$(cat "$work/restore-to/prod/seed.key")" 'seed-test-only'
# A restore that fails after the app was stopped starts it again and says the data's state.
touch "$work/fail.restore"
: >"$LOG"
game --yes restore "$backup" --identity "$work/game" --force-env
equals 'a failing restore ends with an error' "$status" 1
said 'saying the data is as it was' 'it is one transaction, so the database, the volumes and the secret files are as they were'
said 'and that it starts the app' 'backup: starting the app again'
called 'which it does' 'app-started'
rm "$work/fail.restore"

# The game writes its secret files before a restore compares them (v0.39.0): with none written
# yet, or an old one, the server's key of now must meet the backup's.
rm -rf "$work/restore-to"
echo 'the key of now' >"$work/current-key"
: >"$LOG"
game --yes restore "$backup" --identity "$work/game"
equals 'a restore compares against the keys of now' "$status" 1
said 'saying which differs' 'the backup'\''s seed.key differs from'
uncalled 'before the data is touched' 'pg_restore'
echo 'seed-test-only' >"$work/current-key"
echo 'a key left from before' >"$work/restore-to/prod/seed.key"
game --yes restore "$backup" --identity "$work/game"
equals 'and not against a file left from before' "$status" 0
rm -rf "$work/secrets" "$work/restore-secrets" "$work/restore-to" "$work/current-key"

# Only a backup and a restore write secret files.
fresh
rm -f "$work/made-secret"
game status
gone 'status writes no secret file' "$work/made-secret"
game backup
there 'a backup has the game write it first' "$work/made-secret"

# A stack name the update could not keep stays, and a file is put back by renaming (v0.36.0).
fresh
export STACK_OVERRIDE='compose.yml tool.sh'
game update v2
said 'a name not installed yet is said' 'tool.sh is not installed yet'
echo 'the new tool' >"$work/srv/opt/tool.sh"
exec 7<"$work/srv/opt/compose.yml"
game --yes rollback
equals 'the rollback ends well' "$status" 0
said 'a name that was not kept is said, not failed on' 'the update kept no tool.sh: the installed one stays'
equals 'it stays' "$(cat "$work/srv/opt/tool.sh")" 'the new tool'
equals 'the kept file is back' "$(cat "$work/srv/opt/compose.yml")" 'stack of v1'
equals 'by renaming: the file that was open is not written into' "$(cat <&7)" 'stack of v2'
exec 7<&-
unset STACK_OVERRIDE

fresh
game update
said 'update needs a ref' 'usage: game update <git ref>'
game update v2
equals 'update ends well' "$status" 0
said 'it names the backup' "Backup before the update: $work/srv/backups/prod/gm-prod-"
said 'and the new image' 'Updated to v2 (gm-app:v2).'
equals 'the settings name the new image, the rest stays' "$(cat "$work/srv/etc/prod.env")" \
  "SECRET='stays'
GM_IMAGE='gm-app:v2'"
equals 'the rollback data' "$(cat "$work/srv/state/prod/rollback.conf")" \
  "PREVIOUS_IMAGE=gm-app:v1
PREVIOUS_REF=v1
MIGRATIONS_BEFORE=3"
there 'the plain dump is kept' "$work/srv/state/prod/pre-update.dump"
called 'the stack starts' 'compose -p gm-prod up -d'
equals 'the previous image is not pruned' "$(grep -c gm-app:v1 "$work/images")" 1
game update v3
said 'a second update is refused' 'STOP: the last update is not confirmed yet'

: >"$LOG"
answer=no game rollback
said 'rollback asks' 'The data stays as it is. Type yes to go on:'
said 'no: nothing changes' 'STOP: stopped; nothing changed'
uncalled 'not even a backup' 'pg_dump'
answer=yes game rollback
said 'rolled back' 'Rolled back to gm-app:v1 (ref v1).'
uncalled 'the data is untouched' 'pg_restore'
equals 'the old stack is back' "$(cat "$work/srv/opt/compose.yml")" 'stack of v1'
gone 'no rollback data is left' "$work/srv/state/prod/rollback.conf"

fresh
game update v2
echo 4 >"$work/migrations"
: >"$LOG"
touch "$work/fail.restore"
game --yes rollback
equals 'a failing restore fails the rollback' "$status" 1
said 'the app is started again' 'starting the app of prod again'
said 'and the state of the data is said' 'the data is as it was before this rollback'
called 'after it was stopped' 'compose -p gm-prod stop app'
called 'and started' 'compose -p gm-prod start app'
there 'the rollback is still possible' "$work/srv/state/prod/rollback.conf"
equals 'the image stays the new one' "$(grep -c gm-app:v2 "$work/srv/etc/prod.env")" 1
rm "$work/fail.restore"
: >"$LOG"
game --yes rollback
said 'with a schema change the dump is restored' 'Restoring the dump taken before the update.'
called 'by the kit'\''s restore' 'pg_restore'

fresh
game update v2
game --yes confirm
said 'confirm' 'Update confirmed'
gone 'the dump goes' "$work/srv/state/prod/pre-update.dump"
equals 'the old image goes' "$(grep -c gm-app:v1 "$work/images")" 1
game confirm
said 'nothing to confirm twice' 'STOP: no update waiting for confirmation'

fresh
answer=staging game uninstall
said 'it asks for the name' 'Type the environment name (prod) to remove it:'
said 'another name removes nothing' 'STOP: nothing removed'
there 'the settings stay' "$work/srv/etc/prod.env"
uncalled 'no container is touched' 'down'
game --yes uninstall --purge
said 'an unknown option removes nothing' 'unknown option --purge: nothing removed'
there 'still all there' "$work/srv/etc/prod.env"
answer=prod game uninstall
equals 'uninstall ends well' "$status" 0
said 'it says what it keeps' "It keeps the backups in $work/srv/backups/prod."
called 'its containers and volumes' 'compose -p gm-prod down --volumes --remove-orphans'
called 'its timer' 'disable --now gm-backup@prod.timer'
called 'the proxy is reloaded' 'proxy-reloaded'
gone 'its settings' "$work/srv/etc/prod.env"
gone 'its state' "$work/srv/state/prod"
gone 'its route file' "$work/srv/routes/gm-prod.conf"
there 'its backups stay' "$work/srv/backups/prod"
there 'the other environment stays' "$work/srv/etc/staging.env"
there 'and its route' "$work/srv/routes/gm-staging.conf"
there 'and its state' "$work/srv/state/staging"
there 'the units stay while one environment is left' "$work/srv/units/gm-backup@.timer"
there 'and the command' "$work/srv/bin-game"
uncalled 'no image is removed yet' 'image rm'
uncalled 'staging is never touched' 'gm-staging'

touch "$work/fail.nginx"
: >"$LOG"
game --env staging --yes uninstall --purge-backups
equals 'the last environment goes too' "$status" 0
said 'a failing proxy check is said' 'check it, then reload it'
uncalled 'and not reloaded' 'proxy-reloaded'
gone 'its backups, as asked' "$work/srv/backups/staging"
there 'the other backups stay' "$work/srv/backups/prod"
gone 'the units' "$work/srv/units/gm-backup@.timer"
gone 'the command' "$work/srv/bin-game"
gone 'the settings folder' "$work/srv/etc"
gone 'the game folder' "$work/srv/opt"
called 'the images' 'image rm gm-app:v1'
called 'systemd reread' 'daemon-reload'

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
