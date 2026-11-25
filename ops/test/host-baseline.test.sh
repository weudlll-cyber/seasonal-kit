#!/usr/bin/env bash
# @file   ops/test/host-baseline.test.sh
# @brief  The host baseline adds what is missing, never locks SSH out, and changes nothing twice
#         (K88).
#
# Responsibility: `sshd`, `ufw`, `dpkg-query`, `apt-get`, `apt-config` and `systemctl` on the
#                 PATH are stand-ins that keep their state in a temporary folder and record their
#                 calls, so no server is changed. Proves: website mode changes nothing; SSH on
#                 another port is allowed (and 22 not assumed), before the firewall is on; the
#                 operator's own connection port too; updates and the jail added; a second run
#                 changes nothing and says so; no SSH port, a refused rule or a failed install
#                 leave the firewall off; the SSH configuration is only reported. Needs Linux as
#                 root, no Docker. Run: sudo bash ops/test/host-baseline.test.sh (CI job `ops`).
#                 The folder is removed.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export W=$work LOG=$work/calls

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }
said() { if grep -qF -e "$2" "$work/out"; then ok "$1"; else bad "$1: $(tr '\n' '|' <"$work/out")"; fi; }
called() { if grep -qF -e "$2" "$LOG"; then ok "$1"; else bad "$1: no call [$2]"; fi; }
uncalled() { if grep -qF -e "$2" "$LOG"; then bad "$1: [$2] was called"; else ok "$1"; fi; }

mkdir "$work/bin"
stub() {
  {
    printf '#!/usr/bin/env bash\n'
    cat
  } >"$work/bin/$1"
  chmod 0755 "$work/bin/$1"
}
# sshd -T answers from $W/sshd; without the file it fails, as a broken or missing server does.
stub sshd <<'EOF'
printf 'sshd %s\n' "$*" >>"$LOG"
cat "$W/sshd" 2>/dev/null || exit 1
EOF
stub ufw <<'EOF'
printf 'ufw %s\n' "$*" >>"$LOG"
case "$1 ${2:-}" in
  'status ') if [[ -e $W/active ]]; then echo 'Status: active'; else echo 'Status: inactive'; fi ;;
  'allow '*)
    [[ ! -e $W/fail.$(tr / - <<<"$2") ]] || { echo 'ERROR: refused'; exit 1; }
    if grep -qx "$2" "$W/rules" 2>/dev/null; then echo 'Skipping adding existing rule'; else echo "$2" >>"$W/rules"; echo 'Rules updated'; fi ;;
  '--force enable') : >"$W/active" ;;
esac
EOF
stub dpkg-query <<'EOF'
if grep -qx "${@: -1}" "$W/packages" 2>/dev/null; then printf 'install ok installed'; else exit 1; fi
EOF
stub apt-get <<'EOF'
printf 'apt-get %s\n' "$*" >>"$LOG"
[[ ! -e $W/fail.apt ]] || exit 1
[[ $1 != install ]] || echo "${@: -1}" >>"$W/packages"
EOF
stub apt-config <<'EOF'
if grep -qs 'Unattended-Upgrade "1"' "$W"/apt.d/*; then echo 'APT::Periodic::Unattended-Upgrade "1";'; fi
EOF
stub systemctl <<'EOF'
printf 'systemctl %s\n' "$*" >>"$LOG"
EOF
export PATH="$work/bin:$PATH"
export SK_HOST_APT_CONF=$work/apt.d SK_HOST_JAIL_DIR=$work/jail.d

# A fresh server: SSH on <port>, nothing installed, the firewall off.
fresh() {
  rm -rf "$work"/apt.d "$work"/jail.d "$work"/rules "$work"/active "$work"/packages "$work"/fail.* "$LOG"
  mkdir "$work/apt.d" "$work/jail.d"
  printf 'port %s\npermitrootlogin yes\npasswordauthentication yes\n' "${1:-2222}" >"$work/sshd"
  : >"$LOG"
}
# baseline <mode>: in a shell as strict as an installer; output in $work/out, status in $status.
baseline() {
  status=0
  bash -c 'set -euo pipefail; source "$1"; sk_host_baseline "$2"' _ "$root/ops/lib/host-baseline.sh" "$1" \
    >"$work/out" 2>&1 || status=$?
}

fresh
baseline website
equals 'website mode ends well' "$status" 0
said 'and says whose server it is' "the website's installer owns this server's security; nothing changed"
equals 'nothing at all is run' "$(cat "$LOG")" ''

baseline other
equals 'another word stops' "$status" 1

fresh 2222
baseline standalone
equals 'a fresh server ends well' "$status" 0
equals 'SSH where it listens, 80 and 443' "$(cat "$work/rules")" $'2222/tcp\n80/tcp\n443/tcp'
equals 'SSH is allowed before the firewall is on' "$(grep -n -e 'ufw allow 2222/tcp' -e 'ufw --force enable' "$LOG" | cut -d: -f2 | tr '\n' ' ')" \
  'ufw allow 2222/tcp ufw --force enable '
uncalled 'port 22 is not assumed' 'allow 22/tcp'
called 'nothing is upgraded' 'apt-get install -y -q --no-upgrade --no-install-recommends ufw'
called 'updates are installed' 'unattended-upgrades'
equals 'and turned on in a file of their own' "$(cat "$work/apt.d/52seasonal-auto-upgrades")" \
  $'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";'
equals 'the jail watches the SSH port' "$(cat "$work/jail.d/seasonal-sshd.conf")" \
  $'[sshd]\nenabled = true\nbackend = systemd\nport = 2222'
called 'fail2ban starts' 'systemctl restart fail2ban'
said 'SSH is reported' 'root login yes, password login yes'
said 'with advice' 'PermitRootLogin prohibit-password'
equals 'the SSH server is only asked' "$(grep '^sshd' "$LOG" | sort -u)" 'sshd -T'

: >"$LOG"
baseline standalone
equals 'a second run ends well' "$status" 0
for line in '2222/tcp is already allowed' 'firewall: already on' 'updates: already on' 'jail is already in place'; do
  said "it says: $line" "$line"
done
uncalled 'it installs nothing' 'apt-get'
uncalled 'it restarts nothing' 'restart'
uncalled 'it turns nothing on again' '--force enable'

fresh 22
printf 'port 22\nport 2200\n' >"$work/sshd"
SSH_CONNECTION='198.51.100.7 50000 192.0.2.1 2022' baseline standalone
equals 'every SSH port, and the one connected on' "$(cat "$work/rules")" \
  $'22/tcp\n2022/tcp\n2200/tcp\n80/tcp\n443/tcp'
equals 'and the jail has them' "$(grep '^port' "$work/jail.d/seasonal-sshd.conf")" 'port = 22,2022,2200'

fresh
rm "$work/sshd"
baseline standalone
equals 'without an SSH port it stops' "$status" 1
said 'saying so' "cannot read the SSH port from 'sshd -T': nothing changed"
uncalled 'the firewall is not touched' 'ufw'

fresh
touch "$work/fail.2222-tcp"
baseline standalone
equals 'a refused SSH rule stops' "$status" 1
uncalled 'and the firewall stays off' '--force enable'

fresh
touch "$work/fail.apt"
baseline standalone
equals 'a failed install stops' "$status" 1
uncalled 'before the firewall' 'ufw'

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
