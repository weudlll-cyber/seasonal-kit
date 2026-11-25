#!/usr/bin/env bash
# @file   ops/lib/backup-core.sh
# @module ops
# @brief  The backup itself: the settings, the database and volume reads, retention and the timer units.
#
# Responsibility: sourced by ../backup.sh, which sets `set -euo pipefail` and describes every
#                 command; not run on its own.
# Depends on:     bash 4, age, tar, GNU date and find, docker (or pg_dump and psql on the host)
# Source:         ops/backup.sh as released in v0.21.0, split unchanged (v0.25.0, K71); that file
#                 has it from seasonal-bingo-royale ops/lib/backup.sh at dd35d08 and
#                 seasonal-mini-games ops/lib/backup.sh at 1988346.
# Spec:           kit DECISIONS K61, K71

# What this run created and must remove on exit: work folders and throw-away containers.
SK_WORK=()
SK_CONTAINERS=()
cleanup() {
  local c
  for c in "${SK_CONTAINERS[@]-}"; do [[ -z $c ]] || docker rm -f "$c" >/dev/null 2>&1 || true; done
  [[ ${#SK_WORK[@]} -eq 0 ]] || rm -rf "${SK_WORK[@]}"
}
trap cleanup EXIT

# new_work: a private work folder, removed on exit; its name is in WORK.
new_work() {
  WORK=$(mktemp -d)
  SK_WORK+=("$WORK")
}

die() {
  printf 'backup: %s\n' "$*" >&2
  exit 1
}
info() { printf '%s\n' "$*"; }
need() { [[ -n ${!1:-} ]] || die "$1 is not set (see docs/OPERATIONS.md)"; }

# The game's variables, with the defaults a game rarely changes.
env_name() { printf '%s' "${SK_BACKUP_ENV:-prod}"; }
keep_daily() { printf '%s' "${SK_BACKUP_KEEP_DAILY:-14}"; }
keep_weeks() { printf '%s' "${SK_BACKUP_KEEP_WEEKS:-8}"; }

# pg <command...>: a PostgreSQL client command, in the database container or on the host.
pg() {
  if [[ -n ${SK_BACKUP_DB_CONTAINER:-} ]]; then docker exec -i "$SK_BACKUP_DB_CONTAINER" "$@"; else "$@"; fi
}

# pg_target: the arguments that name the database for pg_dump and psql.
pg_target() {
  if [[ -n ${SK_BACKUP_DB_CONTAINER:-} ]]; then
    need SK_BACKUP_DB_USER
    need SK_BACKUP_DB_NAME
    printf '%s\n' -U "$SK_BACKUP_DB_USER" -d "$SK_BACKUP_DB_NAME"
  else
    need SK_BACKUP_DB_URL
    printf '%s\n' --dbname "$SK_BACKUP_DB_URL"
  fi
}

# volume_excludes: the live-state files left out of an uploads volume, as tar arguments. They are
# the game's own (a maintenance flag, a feed's status) and a restore must not bring them back.
volume_excludes() {
  local x
  for x in ${SK_BACKUP_VOLUME_EXCLUDES:-}; do
    [[ $x =~ ^\./[A-Za-z0-9_.-]+$ ]] || die "SK_BACKUP_VOLUME_EXCLUDES holds \"$x\": a path like ./name is expected"
    printf '%s\n' "--exclude=$x"
  done
}

# prune_backups <dir>: keeps the newest SK_BACKUP_KEEP_DAILY (14), and of the older ones the newest
# of each week for SK_BACKUP_KEEP_WEEKS (8) weeks, counted apart from the dailies.
prune_backups() {
  local dir=$1 file week kept=0 weeks=() daily weekly
  daily=$(keep_daily)
  weekly=$(keep_weeks)
  while IFS= read -r file; do
    kept=$((kept + 1))
    ((kept <= daily)) && continue
    week=$(date -u -d "$(basename "$file" | sed -E 's/.*-([0-9]{8})T.*/\1/')" +%G%V)
    if [[ " ${weeks[*]-} " != *" $week "* && ${#weeks[@]} -lt $weekly ]]; then
      weeks+=("$week")
    else
      rm -f "$file"
    fi
  done < <(find "$dir" -maxdepth 1 -name "$SK_BACKUP_PREFIX-$(env_name)-*.tar.age" | sort -r)
}

# add_secret <work>: copies each secret file the game names into the work folder, mode 0600. Only
# the file's name is ever said, never its content.
add_secret() {
  local f
  for f in ${SK_BACKUP_SECRET_FILES:-}; do
    [[ -r $f ]] || die "the secret file $f cannot be read"
    install -m 0600 "$f" "$1/secret-$(basename "$f")"
  done
}

# add_volumes <work>: one tar per named volume, read by a helper container so a crash-looping
# app does not block it.
add_volumes() {
  local v excludes=()
  [[ -n ${SK_BACKUP_VOLUMES:-} ]] || return 0
  need SK_BACKUP_HELPER_IMAGE
  mapfile -t excludes < <(volume_excludes)
  for v in $SK_BACKUP_VOLUMES; do
    docker run --rm --entrypoint tar -v "$v:/data:ro" "$SK_BACKUP_HELPER_IMAGE" \
      -C /data "${excludes[@]}" -cf - . >"$1/vol-$v.tar"
  done
}

# write_manifest <work> <stamp>: what the backup is, never a secret: its prefix, environment and
# time, and the names of its parts.
write_manifest() {
  local f
  {
    printf 'format=1\nprefix=%s\nenv=%s\ncreated=%s\n' "$SK_BACKUP_PREFIX" "$(env_name)" "$2"
    printf 'members='
    for f in "$1"/db.dump "$1"/vol-*.tar "$1"/secret-*; do [[ -e $f ]] && printf '%s ' "${f##*/}"; done
    printf '\n'
  } >"$1/manifest.txt"
}

# do_backup: sets BACKUP_FILE to the new file.
do_backup() {
  local dir work stamp out target=()
  need SK_BACKUP_PREFIX
  need SK_BACKUP_DIR
  need SK_BACKUP_AGE_RECIPIENT
  command -v age >/dev/null || die "age is not installed (apt-get install age)"
  mapfile -t target < <(pg_target)
  dir=$SK_BACKUP_DIR
  new_work
  work=$WORK
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  out="$dir/$SK_BACKUP_PREFIX-$(env_name)-$stamp.tar.age"
  pg pg_dump -Fc "${target[@]}" >"$work/db.dump"
  [[ -s $work/db.dump ]] || die "pg_dump wrote nothing"
  add_volumes "$work"
  add_secret "$work"
  write_manifest "$work" "$stamp"
  if [[ -n ${SK_BACKUP_GROUP:-} ]]; then
    install -d -m 0750 -g "$SK_BACKUP_GROUP" "$dir"
  else
    install -d -m 0750 "$dir"
  fi
  rm -f "$out.partial"
  (cd "$work" && tar -cf - ./* | age -r "$SK_BACKUP_AGE_RECIPIENT") >"$out.partial"
  [[ -z ${SK_BACKUP_GROUP:-} ]] || chgrp "$SK_BACKUP_GROUP" "$out.partial"
  chmod 0640 "$out.partial"
  mv "$out.partial" "$out"
  prune_backups "$dir"
  # shellcheck disable=SC2034 # read by the caller of the sourced function
  BACKUP_FILE=$out
  info "backup written: $(basename "$out")"
}

# print_units: the systemd units for the nightly backup, as the game installs them.
print_units() {
  need SK_BACKUP_PREFIX
  need SK_BACKUP_ENV_FILE
  local self p=$SK_BACKUP_PREFIX
  self=$SK_SELF
  printf '# ---- /etc/systemd/system/%s-backup@.service\n[Unit]\nDescription=%s backup (%%i)\nAfter=docker.service\nRequires=docker.service\nOnFailure=%s-backup-failed@%%i.service\n\n[Service]\nType=oneshot\nEnvironmentFile=%s\nEnvironment=SK_BACKUP_ENV=%%i\nExecStart=%s backup\n\n' "$p" "$p" "$p" "$SK_BACKUP_ENV_FILE" "$self"
  printf '# ---- /etc/systemd/system/%s-backup-failed@.service\n[Unit]\nDescription=%s backup (%%i) failed\n\n[Service]\nType=oneshot\nExecStart=/usr/bin/logger -p user.err -t %s "the backup of %%i failed: journalctl -u %s-backup@%%i"\n\n' "$p" "$p" "$p" "$p"
  printf '# ---- /etc/systemd/system/%s-backup@.timer\n[Unit]\nDescription=%s backup (%%i) every night at 03:30\n\n[Timer]\nOnCalendar=*-*-* 03:30:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n' "$p" "$p"
}
