#!/usr/bin/env bash
# @file   ops/test/image.test.sh
# @brief  `sk_image_verify` passes only a signed image of the project, by its digest and from the
#         expected commit; `sk_cosign_install` installs only the pinned, checked cosign (K109).
#
# Responsibility: `cosign`, `docker` and `curl` are stand-ins on the PATH that record their calls.
#                 Proves:
#                 a signed image is printed as name@digest, the digest looked up for a tag and
#                 taken as given otherwise; cosign is asked for the kit's workflow identity, the
#                 GitHub issuer and the project's repository; a refused signature, an unknown
#                 image, a missing cosign, another commit than the expected one, a bad reference,
#                 commit or repository stop with one sentence and print nothing on standard output;
#                 the install takes a download only with the pinned checksum, and nothing else
#                 changes when it differs. The real signature is proved by
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
# The certificate's commit, when a test states one: any other asked for is refused.
if [[ -e $W/commit && $* == *--certificate-github-workflow-sha* ]]; then
  [[ $* == *"--certificate-github-workflow-sha $(<"$W/commit")"* ]] || exit 1
fi
[[ ! -e $W/unsigned ]]
EOF
cat >"$work/bin/docker" <<EOF
#!/usr/bin/env bash
printf 'docker %s\n' "\$*" >>"\$LOG"
[[ ! -e \$W/unknown ]] || exit 1
echo '$digest'
EOF
# A download: whatever the test put in $W/download, written where `-o` says.
cat >"$work/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf 'curl %s\n' "$*" >>"$LOG"
[[ -e $W/download ]] || exit 22
while (($#)); do [[ $1 != -o ]] || cp "$W/download" "$2"; shift; done
EOF
chmod 0755 "$work/bin/cosign" "$work/bin/docker" "$work/bin/curl"
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
  'cosign is not installed, so no image can be checked (sk_cosign_install installs it).'

echo 'the source commit'
commit=$(printf 'b%.0s' {1..40})
other=$(printf 'c%.0s' {1..40})
echo "$commit" >"$work/commit"
SK_IMAGE_COMMIT=$commit verify ghcr.io/example/game:1.2.0
equals 'the expected commit passes' "$status" 0
called 'asked of the certificate' "--certificate-github-workflow-sha $commit"
SK_IMAGE_COMMIT=$other refused 'another commit' ghcr.io/example/game:1.2.0 \
  "ghcr.io/example/game:1.2.0 was not built from commit $other, so it is not used."
SK_IMAGE_COMMIT=v1.2.0 refused 'a commit that is none' ghcr.io/example/game:1.2.0 \
  'SK_IMAGE_COMMIT is a full commit, 40 hex digits.'
rm "$work/commit"

echo 'installing cosign'
mkdir "$work/into"
printf '#!/bin/sh\necho cosign-test\n' >"$work/download"
sum=$(sha256sum "$work/download" | cut -d' ' -f1)
# install_cosign <checksum>: the pinned checksum is the test's, set after the file is read.
install_cosign() {
  : >"$LOG"
  status=0
  SK_COSIGN_DIR="$work/into" bash -c 'source "$1"; SK_COSIGN_SHA256_AMD64=$2; SK_COSIGN_SHA256_ARM64=$2; sk_cosign_install' \
    _ "$kit/ops/lib/image.sh" "$1" >"$work/out" 2>"$work/err" || status=$?
  said=$(<"$work/err")
}
install_cosign "$(printf '0%.0s' {1..64})"
equals 'a wrong checksum: stops' "$status" 1
equals 'saying so' "$said" 'image: the downloaded cosign does not carry the pinned checksum, so it is not installed.'
equals 'and installs nothing' "$(ls -A "$work/into")" ''
install_cosign "$sum"
equals 'the pinned checksum installs' "$status" 0
equals 'the file as downloaded, to run' "$("$work/into/cosign")" cosign-test
called 'the pinned version over https' 'https://github.com/sigstore/cosign/releases/download/v3.'
install_cosign "$sum"
equals 'installed already: nothing fetched' "$(grep -c '^curl' "$LOG" || true)" 0
rm "$work/into/cosign" "$work/download"
install_cosign "$sum"
equals 'a failed download: stops' "$status" 1
equals 'in one sentence' "$said" 'image: cosign could not be downloaded.'

if ((failures > 0)); then
  printf '\n%d check(s) failed\n' "$failures"
  exit 1
fi
printf '\nall checks passed\n'
