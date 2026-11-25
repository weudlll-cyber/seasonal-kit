#!/usr/bin/env bash
# @file   ops/test/operator.test.sh
# @brief  The operator's address: read, written once, a passed one winning, the stop without a
#         terminal, the one question at a terminal and the refusals (K85).
#
# Responsibility: a temporary folder stands in for /etc/seasonal; every call runs in a shell of
#                 its own, as strict as an installer (`set -euo pipefail`). Example addresses only.
#                 Needs Linux (`script` gives the interactive case its terminal), no Docker.
#                 Run: bash ops/test/operator.test.sh (CI job `ops`). The folder is removed.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export SK_OPERATOR_DIR="$work/etc"
file="$SK_OPERATOR_DIR/operator.env"

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }

# One call without a terminal: its output in $out, what it says in $said, its status in $status.
# The single quotes are meant: the code inside them is expanded by that shell.
# shellcheck disable=SC2016
call() {
  status=0
  out=$(bash -c 'set -euo pipefail; source "$1"; shift; email=$(sk_operator_email "$@"); printf %s "$email"' \
    _ "$root/ops/lib/operator.sh" "$@" 2>"$work/said" </dev/null) || status=$?
  said=$(cat "$work/said")
}

call
equals 'without a file, an address or a terminal it stops' "$status" 1
equals 'in one sentence naming the file and the key' "$said" \
  "operator address: set SK_OPERATOR_EMAIL in $file, or pass --email to the installer."
if [[ ! -e $file ]]; then ok 'and writes nothing'; else bad 'a file was written'; fi

# The single quotes are meant: the address must reach the function as written.
# shellcheck disable=SC2016
for wrong in 'ops' 'ops@host' 'ops @example.org' 'ops@example.org;id' '$(id)@example.org' 'a@b@example.org'; do
  call "$wrong"
  if [[ $status != 0 && $said != *"$wrong"* && ! -e $file ]]; then
    ok "refuses a passed address of a wrong form, without saying it"
  else
    bad "wrong form accepted or said (status $status)"
  fi
done

call 'ops@example.org'
equals 'a passed address is the answer' "$out" 'ops@example.org'
equals 'and is written when the file has none' "$(cat "$file")" 'SK_OPERATOR_EMAIL=ops@example.org'
equals 'readable by all, written by its owner' "$(stat -c %a "$file")" 644
equals 'saying where it is' "$said" "using ops@example.org from $file"

call
equals 'then the file answers' "$out" 'ops@example.org'
equals 'and says so' "$said" "using ops@example.org from $file"

call 'other@example.org'
equals 'a passed address wins' "$out" 'other@example.org'
equals 'the file keeps the first' "$(cat "$file")" 'SK_OPERATOR_EMAIL=ops@example.org'
if [[ $said != *@* ]]; then ok 'and neither address is said'; else bad "an address was said: $said"; fi

printf '# the operator\nOTHER=1\n' >"$file"
call 'ops@example.org'
equals 'other lines are kept' "$(cat "$file")" $'# the operator\nOTHER=1\nSK_OPERATOR_EMAIL=ops@example.org'

printf 'SK_OPERATOR_EMAIL="quoted@example.org"\r\n' >"$file"
call
equals 'quotes and a carriage return are taken off' "$out" 'quoted@example.org'

# shellcheck disable=SC2016
printf 'SK_OPERATOR_EMAIL=$(touch %s/ran)\n' "$work" >"$file"
call
equals 'a file with another form is refused' "$status" 1
if [[ ! -e $work/ran ]]; then ok 'and the file is never run'; else bad 'the file was run'; fi

rm -f "$file"
# The one question, at a terminal of its own: <answer> is typed at it.
ask="source '$root/ops/lib/operator.sh'; sk_operator_email >'$work/answer'"
at_terminal() {
  (sleep 1; printf '%s\n' "$1") | script -qec "bash -c \"$ask\"" /dev/null >"$work/terminal" 2>&1 || true
}
at_terminal 'not-an-address'
if [[ ! -e $file ]]; then ok 'a typed answer of a wrong form is not written'; else bad 'it was written'; fi
at_terminal 'asked@example.org'
equals 'at a terminal it asks and answers' "$(cat "$work/answer" 2>/dev/null)" 'asked@example.org'
equals 'and writes the answer' "$(cat "$file" 2>/dev/null)" 'SK_OPERATOR_EMAIL=asked@example.org'
equals 'asking once' "$(grep -o 'Operator e-mail' "$work/terminal" | wc -l)" 1

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
