#!/usr/bin/env bash
# @file   ops/test/backup-units.test.sh
# @brief  The nightly backup's service runs the script by the path it was called by, which
#         survives a kit update, and never by one inside the pnpm store.
#
# Responsibility: the shipped scripts are copied into a pnpm-like store and linked as a game's
#                 node_modules/@seasonal/kit. `print-units` called through the link, absolutely or
#                 relatively, writes the link's absolute path as ExecStart and keeps
#                 After=/Requires=docker.service; called by the store's path it refuses, naming
#                 the link to call, and writes no unit. Needs Linux (real symbolic links), no
#                 database and no Docker. Run: bash ops/test/backup-units.test.sh (CI job `ops`).
#                 Its temporary folder is removed.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }

store="$work/game/node_modules/.pnpm/kit@1/node_modules/@seasonal/kit"
link="$work/game/node_modules/@seasonal/kit"
mkdir -p "$store/ops/lib" "$work/game/node_modules/@seasonal"
cp "$root/ops/backup.sh" "$store/ops/"
cp "$root/ops/lib/backup-core.sh" "$root/ops/lib/backup-restore.sh" "$store/ops/lib/"
ln -s "$store" "$link"

units() { SK_BACKUP_PREFIX=sk SK_BACKUP_ENV_FILE=/etc/sk/backup.env bash "$1" print-units; }
started() { grep '^ExecStart=.* backup$' <<<"$1"; }

said=$(units "$link/ops/backup.sh")
equals 'the service runs the path called' "$(started "$said")" "ExecStart=$link/ops/backup.sh backup"
equals 'after Docker' "$(grep -c -e '^After=docker.service$' -e '^Requires=docker.service$' <<<"$said")" 2

said=$(cd "$work/game" && units node_modules/@seasonal/kit/ops/backup.sh)
equals 'a relative call is written absolute' "$(started "$said")" "ExecStart=$link/ops/backup.sh backup"

if said=$(units "$store/ops/backup.sh" 2>"$work/refusal"); then
  bad 'the store path is refused'
else
  ok 'the store path is refused'
fi
equals 'and no unit is written' "$said" ''
if grep -qF 'call node_modules/@seasonal/kit/ops/backup.sh instead' "$work/refusal"; then
  ok 'the refusal names the link'
else
  bad "the refusal names the link: $(cat "$work/refusal")"
fi

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
