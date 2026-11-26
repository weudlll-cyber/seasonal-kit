#!/usr/bin/env bash
# @file   ops/test/image.test.sh
# @brief  `sk_image_verify` passes only a signed image of the project, by its digest (K109).
#
# Responsibility: `cosign` and `docker` are stand-ins on the PATH that record their calls. Proves:
#                 a signed image is printed as name@digest, the digest looked up for a tag and
#                 taken as given otherwise; cosign is asked for the kit's workflow identity, the
#                 GitHub issuer and the project's repository; a refused signature, an unknown
#                 image, a missing cosign, a bad reference and a missing repository stop with one
#                 sentence and print nothing on standard output. The real signature is proved by
#                 .github/workflows/release-image-test.yml. Run: bash ops/test/image.test.sh
#                 (CI job `ops`). The folder it makes is removed.
set -euo pipefail

kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export W=$work LOG=$work/calls

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
equals() { if [[ $2 == "$3" ]]; then ok "$1"; else bad "$1: got [$2]"; fi; }
called() { if grep -qF -e "$2" "$LOG"; then ok "$1"; else bad "$1: no call [$2]"; fi; }

mkdir "$work/bin" "$work/bare"
digest="sha256:$(printf 'a%.0s' {1..64})"
cat >"$work/bin/cosign" <<'EOF'
#!/usr/bin/env bash
printf 'cosign %s\n' "$*" >>"$LOG"
echo 'cosign: some long detail' >&2
[[ ! -e $W/unsigned ]]
EOF
cat >"$work/bin/docker" <<EOF
#!/usr/bin/env bash
printf 'docker %s\n' "\$*" >>"\$LOG"
[[ ! -e \$W/unknown ]] || exit 1
echo '$digest'
EOF
chmod 0755 "$work/bin/cosign" "$work/bin/docker"
export PATH="$work/bin:$PATH"

export SK_IMAGE_REPOSITORY=example/game
# verify <reference>: its output in $out, its words in $said, its status in $status.
verify() {
  : >"$LOG"
  status=0
  out=$(bash -c 'source "$1"; sk_image_verify "$2"' _ "$kit/ops/lib/image.sh" "$1" 2>"$work/err") || status=$?
  said=$(<"$work/err")
}
# refused <what> <reference> <sentence>: stops, says exactly that, prints no image.
refused() {
  verify "$2"
  equals "$1: stops" "$status" 1
  equals "$1: one sentence" "$said" "image: $3"
  equals "$1: no image on standard output" "$out" ''
}

echo signed
verify ghcr.io/example/game:1.2.0
equals 'a signed tag passes' "$status" 0
equals 'and is printed by its digest' "$out" "ghcr.io/example/game@$digest"
called 'the tag is looked up' 'imagetools inspect ghcr.io/example/game:1.2.0'
called 'the signature is checked on the digest' "ghcr.io/example/game@$digest"
called 'the issuer is GitHub Actions' '--certificate-oidc-issuer https://token.actions.githubusercontent.com'
called 'the signer is the kit workflow' 'weudlll-cyber/seasonal-kit/\.github/workflows/release-image\.yml@'
called 'in the project repository' '--certificate-github-workflow-repository example/game'
verify "registry.example:5000/game@$digest"
equals 'a digest passes as given, the port kept' "$out" "registry.example:5000/game@$digest"
equals 'and nothing is looked up' "$(grep -c '^docker' "$LOG" || true)" 0
SK_IMAGE_SIGNER='^https://github\.com/example/' verify ghcr.io/example/game:1.2.0
called 'a project may name another signer' '--certificate-identity-regexp ^https://github\.com/example/'

echo refused
touch "$work/unsigned"
refused 'an unsigned or foreign image' ghcr.io/example/game:1.2.0 \
  "ghcr.io/example/game:1.2.0 carries no signature of example/game's release workflow, so it is not used."
rm "$work/unsigned"
touch "$work/unknown"
refused 'an image the registry lacks' ghcr.io/example/game:9.9.9 \
  'ghcr.io/example/game:9.9.9 cannot be found in its registry, so it is not used.'
rm "$work/unknown"
for bad_ref in '' game:1.0 'ghcr.io/example/game:1 --insecure' '--help' 'ghcr.io/Example/game'; do
  refused "the reference [$bad_ref]" "$bad_ref" 'pass an image with its registry, like ghcr.io/owner/game:1.2.0.'
done
SK_IMAGE_REPOSITORY='' refused 'no repository' ghcr.io/example/game:1.2.0 \
  "SK_IMAGE_REPOSITORY is the project's repository, as owner/name."
# A PATH with bash alone: no cosign.
ln -s "$(command -v bash)" "$work/bare/bash"
PATH="$work/bare" refused 'no cosign' ghcr.io/example/game:1.2.0 \
  'cosign is not installed, so no image can be checked.'

if ((failures > 0)); then
  printf '\n%d check(s) failed\n' "$failures"
  exit 1
fi
printf '\nall checks passed\n'
