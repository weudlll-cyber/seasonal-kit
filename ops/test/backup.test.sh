#!/usr/bin/env bash
# @file   ops/test/backup.test.sh
# @module ops
# @brief  Proves ops/backup.sh on a real PostgreSQL container: back up, restore into a fresh one,
#         compare; the drill; the refusals; the retention.
#
# Responsibility: needs docker, age and bash; creates only containers, volumes and files whose names
#                 carry its own process id, and removes them on exit. The database image is the
#                 digest-pinned one both games use. Checks, each one failing if its rule breaks:
#                 - help runs without any setting;
#                 - the retention keeps the 14 newest and the newest of each of 8 older weeks;
#                 - a backup is age-encrypted, holds none of its secret in the clear, and names
#                   its parts; a restore into a FRESH database gives every table the same rows,
#                   the volume's files back (but not a live-state file it excludes) and the
#                   secret file back; the drill compares each table with the dump and passes;
#                 - a restore of another environment's backup is refused (by name, and for a
#                   renamed file by its manifest) and touches nothing; a differing secret, a
#                   --secrets-to that is no folder and a missing setting are refused before the
#                   app is stopped or anything replaced; an archive with a member the script does
#                   not know is refused;
#                 - no output ever holds the secret.
# Source:         new in the kit; the digest of the image is the one in seasonal-bingo-royale
#                 ops/compose.yml and seasonal-mini-games ops/compose.yml.
# Spec:           kit DECISIONS K61
#
# Usage: bash ops/test/backup.test.sh
set -euo pipefail

# Git Bash on Windows rewrites /data-like arguments; docker must get them as written. The function
# is exported, so the script under test uses it too; on Linux it changes nothing.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
export -f docker
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
script="$here/../backup.sh"
PG_IMAGE=${SK_TEST_PG_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}
id=$$
src="sk-test-$id-src" dst="sk-test-$id-dst" vol="sk-test-$id-data"
tmp=$(mktemp -d)
failures=0

cleanup() {
  docker rm -f "$src" "$dst" >/dev/null 2>&1 || true
  docker volume rm -f "$vol" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

check() { # check <description> <command...>
  local what=$1
  shift
  if "$@" >/dev/null 2>&1; then printf '  ok   %s\n' "$what"; else printf '  FAIL %s\n' "$what"; failures=$((failures + 1)); fi
}
refused() { # refused <description> <message part> <command...>: it must fail, saying so
  local what=$1 part=$2 out
  shift 2
  if out=$("$@" 2>&1); then
    printf '  FAIL %s (it succeeded)\n' "$what"
    failures=$((failures + 1))
  elif [[ $out == *"$part"* ]]; then
    printf '  ok   %s\n' "$what"
  else
    printf '  FAIL %s (said: %s)\n' "$what" "$out"
    failures=$((failures + 1))
  fi
}
sql() { docker exec "$1" psql -U app -d app -tA -c "$2"; }
tables() { sql "$1" "SELECT 'accounts=' || count(*) FROM app.accounts UNION ALL SELECT 'events=' || count(*) FROM app.events UNION ALL SELECT 'empty=' || count(*) FROM app.empty_one UNION ALL SELECT 'pub=' || count(*) FROM public.plain ORDER BY 1"; }

echo "help and retention"
check "help runs with no setting at all" bash -c "env -i PATH=\"$PATH\" bash '$script' help | grep -q 'restore <file>'"
check "no command prints the help too" bash -c "env -i PATH=\"$PATH\" bash '$script' | grep -q 'Usage: ops/backup.sh'"

keep_check() {
  local dir="$tmp/ret" i d kept
  mkdir -p "$dir"
  for i in $(seq 0 99); do
    d=$(date -u -d "2026-08-01 +$i day" +%Y%m%d)
    : >"$dir/sk-prod-${d}T030000Z.tar.age"
  done
  : >"$dir/sk-staging-20260101T030000Z.tar.age" # another environment: never touched
  SK_BACKUP_SOURCE_ONLY=1 SK_BACKUP_PREFIX=sk SK_BACKUP_ENV=prod \
    bash -c 'source "$1" && prune_backups "$2"' _ "$script" "$dir"
  kept=$(find "$dir" -name 'sk-prod-*' | sort -r)
  [[ $(printf '%s\n' "$kept" | head -n 14 | wc -l) == 14 ]] || return 1
  # The newest 14 are the last 14 days; the rest are one per week, 8 of them, newest of the week.
  [[ -e $dir/sk-prod-20261108T030000Z.tar.age && -e $dir/sk-prod-20261025T030000Z.tar.age ]] || return 1
  [[ $(printf '%s\n' "$kept" | wc -l) == 22 ]] || return 1
  [[ ! -e $dir/sk-prod-20260801T030000Z.tar.age ]] || return 1
  [[ -e $dir/sk-staging-20260101T030000Z.tar.age ]]
}
check "retention: 14 newest + 8 weekly, another environment untouched" keep_check

echo "backup, drill, restore into a fresh database"
docker run -d --name "$src" -e POSTGRES_USER=app -e POSTGRES_PASSWORD=x -e POSTGRES_DB=app "$PG_IMAGE" >/dev/null
docker run -d --name "$dst" -e POSTGRES_USER=app -e POSTGRES_PASSWORD=x -e POSTGRES_DB=app "$PG_IMAGE" >/dev/null
for c in "$src" "$dst"; do
  # Over TCP: the set-up server of a new database answers on the socket only.
  for _ in $(seq 1 60); do docker exec "$c" pg_isready -h 127.0.0.1 -U app -d app >/dev/null 2>&1 && break; sleep 1; done
done
sql "$src" "CREATE SCHEMA app; CREATE TABLE app.accounts(id int primary key, name text); CREATE TABLE app.events(id serial primary key, body text); CREATE TABLE app.empty_one(x int); CREATE TABLE public.plain(v text); INSERT INTO app.accounts VALUES (1,'ann'),(2,'bob'),(3,'cy'); INSERT INTO app.events(body) SELECT 'event ' || g FROM generate_series(1,5) g; INSERT INTO public.plain VALUES ('one'),('two');" >/dev/null
docker volume create "$vol" >/dev/null
docker run --rm -v "$vol:/data" "$PG_IMAGE" sh -c 'mkdir -p /data/sub && echo alpha > /data/a.txt && echo beta > /data/sub/b.txt && echo live > /data/maintenance' >/dev/null
secret=$(head -c 20 /dev/urandom | od -An -tx1 | tr -d ' 
')
printf '%s\n' "$secret" >"$tmp/seed.key"
age-keygen -o "$tmp/key.txt" >/dev/null 2>&1
recipient=$(age-keygen -y "$tmp/key.txt")

config() {
  export SK_BACKUP_PREFIX=sk SK_BACKUP_ENV="${1:-prod}" SK_BACKUP_DIR="$tmp/backups" SK_BACKUP_AGE_RECIPIENT="$recipient"
  export SK_BACKUP_DB_CONTAINER="${2:-$src}" SK_BACKUP_DB_USER=app SK_BACKUP_DB_NAME=app SK_BACKUP_DB_SCHEMA=app
  export SK_BACKUP_VOLUMES="$vol" SK_BACKUP_HELPER_IMAGE="$PG_IMAGE" SK_BACKUP_VOLUME_EXCLUDES=./maintenance
  export SK_BACKUP_SECRET_FILES="$tmp/seed.key" SK_BACKUP_PG_IMAGE="$PG_IMAGE"
}
run() { bash "$script" "$@"; }

config prod "$src"
backup_out=$(run backup 2>&1)
file=$(find "$tmp/backups" -name 'sk-prod-*.tar.age' | head -n 1)
check "a backup file is written, named by prefix, environment and time" test -s "$file"
check "it is age-encrypted" bash -c "head -c 21 '$file' | grep -q 'age-encryption.org'"
check "it holds none of its secret in the clear" bash -c "! grep -qa '$secret' '$file'"
check "the backup's own output says no secret" bash -c "[[ '$backup_out' != *'$secret'* ]]"

drill_out=$(run drill "$file" --identity "$tmp/key.txt" 2>&1)
check "the drill passes" bash -c "[[ '$drill_out' == *'drill passed'* ]]"
check "the drill compares each table with the dump" bash -c "[[ '$drill_out' == *'app.accounts: 3 rows restored'* && '$drill_out' == *'app.events: 5 rows restored'* && '$drill_out' == *'public.plain: 2 rows restored'* ]]"
check "the drill leaves no secret in its output" bash -c "[[ '$drill_out' != *'$secret'* ]]"
check "the drill leaves no container behind" bash -c "[[ -z \$(docker ps -a --filter name=sk-drill- -q) ]]"

docker volume rm -f "$vol" >/dev/null
docker volume create "$vol" >/dev/null
docker run --rm -v "$vol:/data" "$PG_IMAGE" sh -c 'echo stale > /data/old.txt; echo livenow > /data/maintenance' >/dev/null
config prod "$dst"
restore_out=$(run restore "$file" --identity "$tmp/key.txt" --yes --secrets-to "$tmp/restored" 2>&1)
check "the restore says it restored" bash -c "[[ '$restore_out' == *'restored sk-prod-'* ]]"
check "a fresh database has every table's rows: the same as the source" bash -c "[[ \"\$(docker exec $dst psql -U app -d app -tA -c \"SELECT 'accounts=' || count(*) FROM app.accounts UNION ALL SELECT 'events=' || count(*) FROM app.events UNION ALL SELECT 'empty=' || count(*) FROM app.empty_one UNION ALL SELECT 'pub=' || count(*) FROM public.plain ORDER BY 1\")\" == \"\$(docker exec $src psql -U app -d app -tA -c \"SELECT 'accounts=' || count(*) FROM app.accounts UNION ALL SELECT 'events=' || count(*) FROM app.events UNION ALL SELECT 'empty=' || count(*) FROM app.empty_one UNION ALL SELECT 'pub=' || count(*) FROM public.plain ORDER BY 1\")\" ]]"
check "the rows themselves match, not only their number" bash -c "[[ \"\$(docker exec $dst psql -U app -d app -tA -c 'SELECT id, name FROM app.accounts ORDER BY id')\" == \"\$(docker exec $src psql -U app -d app -tA -c 'SELECT id, name FROM app.accounts ORDER BY id')\" ]]"
files=$(docker run --rm -v "$vol:/data" "$PG_IMAGE" sh -c 'cat /data/a.txt /data/sub/b.txt; cat /data/maintenance; ls /data' | tr '\n' ' ')
check "the volume's files are back, the stale one gone" bash -c "[[ '$files' == 'alpha beta livenow a.txt maintenance sub ' ]]"
check "the live-state file the game excludes stayed as it was" bash -c "[[ '$files' == *livenow* ]]"
check "the secret file is back, byte for byte, mode 0600" bash -c "cmp -s '$tmp/seed.key' '$tmp/restored/seed.key' && [[ \$(stat -c %a '$tmp/restored/seed.key') == 600 ]]"
check "the restore's output says no secret" bash -c "[[ '$restore_out' != *'$secret'* ]]"

echo "refusals"
sql "$dst" "INSERT INTO app.accounts VALUES (99,'marker')" >/dev/null
config staging "$src"
run backup >/dev/null 2>&1
other=$(find "$tmp/backups" -name 'sk-staging-*.tar.age' | head -n 1)
config prod "$dst"
refused "a restore of another environment's backup is refused" "is not a backup of prod" \
  bash "$script" restore "$other" --identity "$tmp/key.txt" --yes
check "and touches nothing: the marker row is still there" bash -c "[[ \"\$(docker exec $dst psql -U app -d app -tA -c \"SELECT name FROM app.accounts WHERE id=99\")\" == marker ]]"
renamed="$tmp/backups/sk-prod-20260101T000000Z.tar.age"
cp "$other" "$renamed"
refused "a renamed file is refused by its manifest" "not of sk/prod" \
  bash "$script" restore "$renamed" --identity "$tmp/key.txt" --yes
# A differing secret: refused while nothing is stopped or replaced; forced, all three are replaced.
printf 'a different key\n' >"$tmp/restored/seed.key"
docker run --rm -v "$vol:/data" "$PG_IMAGE" sh -c 'echo kept > /data/kept.txt; rm /data/a.txt' >/dev/null
marker() { docker exec "$dst" psql -U app -d app -tA -c "SELECT name FROM app.accounts WHERE id=99"; }
listing() { docker run --rm -v "$vol:/data" "$PG_IMAGE" ls /data | tr '\n' ' '; }
with_secrets=(bash "$script" restore "$file" --identity "$tmp/key.txt" --yes --secrets-to "$tmp/restored")
export SK_BACKUP_STOP_CMD="touch '$tmp/stopped'"
refused "a secret that differs from the one on disk stops the restore" "differs from" "${with_secrets[@]}"
check "before the database is replaced: the marker row is still there" test "$(marker)" = marker
check "before the volume is replaced" test "$(listing)" = 'kept.txt maintenance sub '
check "the secret on disk is untouched" test "$(cat "$tmp/restored/seed.key")" = 'a different key'
check "and the app was never stopped" test ! -e "$tmp/stopped"
: >"$tmp/a-file"
refused "a --secrets-to that is a file is refused" "is not a folder" \
  bash "$script" restore "$file" --identity "$tmp/key.txt" --yes --secrets-to "$tmp/a-file"
refused "a missing helper image is refused" "SK_BACKUP_HELPER_IMAGE is not set" \
  env -u SK_BACKUP_HELPER_IMAGE "${with_secrets[@]}" --force-env
check "both before the database is replaced" test "$(marker)" = marker
unset SK_BACKUP_STOP_CMD
check "forced, the restore runs" "${with_secrets[@]}" --force-env
check "the database is replaced" test -z "$(marker)"
check "the volume is replaced" test "$(listing)" = 'a.txt maintenance sub '
check "and the backup's secret replaces the one on disk" cmp -s "$tmp/seed.key" "$tmp/restored/seed.key"
refused "a restore needs the key" "pass your age key file" bash "$script" restore "$file" --yes

evil="$tmp/evil"
mkdir -p "$evil"
(cd "$evil" && printf 'x' >db.dump && printf 'format=1\nprefix=sk\nenv=prod\n' >manifest.txt && printf 'x' >evil.sh && tar -cf - db.dump manifest.txt evil.sh | age -r "$recipient" >"$tmp/backups/sk-prod-20260102T000000Z.tar.age")
refused "an archive with a member the script does not know is not unpacked" "holds a member this script does not know" \
  bash "$script" restore "$tmp/backups/sk-prod-20260102T000000Z.tar.age" --identity "$tmp/key.txt" --yes

echo "units"
check "print-units writes a service, a failure unit and a 03:30 timer" bash -c "SK_BACKUP_PREFIX=sk SK_BACKUP_ENV_FILE=/etc/sk/backup.env bash '$script' print-units | grep -q 'OnCalendar=\*-\*-\* 03:30:00'"

if ((failures > 0)); then
  printf '\n%d check(s) failed\n' "$failures"
  exit 1
fi
printf '\nall checks passed\n'
