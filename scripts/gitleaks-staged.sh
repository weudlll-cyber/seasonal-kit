#!/bin/sh
# @file   scripts/gitleaks-staged.sh
# @brief  The pre-commit secret scan: gitleaks over the staged changes, in the image CI uses.
#
# Responsibility: run by lefthook.yml before every commit; fails the commit on any finding.
#                 Docker must be running. Proven against a staged fake secret on 2026-11-20
#                 (docs/security-pass.md).
# Source:         new in the kit.
set -eu

ROOT=$(git rev-parse --show-toplevel)
IMAGE=ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f

# MSYS_NO_PATHCONV keeps Git Bash on Windows from rewriting the container paths. The
# safe.directory entry lets the container's git read the mounted repository (another user owns
# it): without it git fails, gitleaks scans nothing and still passes.
MSYS_NO_PATHCONV=1 docker run --rm \
  -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0=/repo \
  -v "$ROOT:/repo" -w /repo "$IMAGE" \
  git --pre-commit --staged --redact --no-banner /repo
