#!/usr/bin/env bash
# @file   ops/test/backup-url.test.sh
# @brief  A DATABASE_URL's password reaches the PostgreSQL clients through their environment and
#         never on a command line (K75).
#
# Responsibility: with stand-in `pg_dump`, `pg_restore` and `psql` on the PATH, which record their
#                 arguments and their PGPASSWORD, the backup's and the restore's database calls on
#                 the host: the password is the percent-decoded one, the address handed over has no
#                 password, a URL without one is passed as it is, a password in the query and a bad
#                 escape are refused without saying them, and nothing printed holds the password.
#                 Needs no database and no Docker. Run: bash ops/test/backup-url.test.sh (CI job
#                 `ops`). Its temporary folder is removed.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
script="$root/ops/backup.sh"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }

# The stand-in clients: one line per argument, and the password they were given.
mkdir "$work/bin"
for client in pg_dump pg_restore psql; do
  cat >"$work/bin/$client" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$@" >>'$work/args'
printf '%s' "\${PGPASSWORD-unset}" >'$work/password.$client'
cat >/dev/null 2>&1 </dev/null || true
printf 'data'
EOF
  chmod +x "$work/bin/$client"
done

# run <url> <function call>: the call, in a shell of its own, with the script's functions.
# The single quotes are meant: the code inside them is expanded by that shell.
# shellcheck disable=SC2016
run() {
  rm -f "$work"/args "$work"/password.*
  env -u PGPASSWORD PATH="$work/bin:$PATH" SK_BACKUP_SOURCE_ONLY=1 SK_BACKUP_DB_URL="$1" \
    bash -c 'source "$1" && eval "$2"' _ "$script" "$2"
}
# shellcheck disable=SC2016
dump='split_db_url; mapfile -t target < <(pg_target); pg pg_dump -Fc "${target[@]}" >/dev/null'

# Every character a password may need escaped, a backslash and a percent sign among them.
secret='p@ss:w/rd%1\n?#'
encoded='p%40ss%3Aw%2Frd%251%5Cn%3F%23'
url="postgresql://game:$encoded@db.internal:5432/game?sslmode=require"

said=$(run "$url" "$dump" 2>&1)
equals 'pg_dump gets the decoded password' "$(cat "$work/password.pg_dump")" "$secret"
equals 'the address has no password' "$(grep '^postgres' "$work/args")" 'postgresql://game@db.internal:5432/game?sslmode=require'
if grep -qF -e "$secret" -e "$encoded" "$work/args"; then bad 'no password on a command line'; else ok 'no password on a command line'; fi
equals 'nothing is printed' "$said" ''

: >"$work/db.dump"
run "$url" "restore_database '$work/db.dump'" >/dev/null
equals 'the restore gives psql the same password' "$(cat "$work/password.psql")" "$secret"
if grep -qF -e "$secret" -e "$encoded" "$work/args"; then bad 'none on the restore command lines'; else ok 'none on the restore command lines'; fi

run 'postgres://game:a%40b@h@db/game' "$dump" >/dev/null
equals 'the host starts after the last @' "$(grep '^postgres' "$work/args")" 'postgres://game@db/game'
equals 'and the password keeps the earlier one' "$(cat "$work/password.pg_dump")" 'a@b@h'

for plain in 'postgresql://game@db/game' 'postgresql:///game' 'host=db dbname=game'; do
  run "$plain" "$dump" >/dev/null
  equals "passed as it is: $plain" "$(sed -n '/--dbname/{n;p;}' "$work/args")" "$plain"
  equals "no password set for: $plain" "$(cat "$work/password.pg_dump")" 'unset'
done

for refused in 'postgresql://game@db/game?password=topsecret' 'postgresql://game:top%zzsecret@db/game'; do
  if said=$(run "$refused" "$dump" 2>&1); then bad "refused: ${refused%%:*}"; else
    if [[ $said == *topsecret* || $said == *top%zz* ]]; then bad 'the refusal says the password'; else ok 'refused without saying it'; fi
  fi
  if [[ ! -e $work/args ]]; then ok 'and no client is run'; else bad 'a client ran'; fi
done

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
