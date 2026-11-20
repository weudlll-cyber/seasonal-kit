# Security pass

The results of each security pass over the kit, newest first. Each pass names its tools with
their versions, the commands, every finding with its verdict, and what was fixed. Adapted from
Mini Games' `docs/security-pass.md` (at `93ed780`) to a library: no server, no web pages of its
own, so no web scan; the scans are those of CI, run over the whole history and the lockfile.

A pass is due before each minor or major release (docs/RELEASING.md) and after any change to the
delivery (docs/DELIVERY.md).

## What a pass covers

| Scan                         | Tool                                            | Command                                                                            |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Secrets in the whole history | gitleaks 8.30.1 (the image CI uses)             | `gitleaks git /repo --log-opts="--all" --redact`                                   |
| Dependencies                 | osv-scanner 2.7.0 (the image CI uses)           | `osv-scanner scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml`      |
| Code                         | CodeQL (javascript-typescript, CI)              | `.github/workflows/codeql.yml`; results in the repository's code scanning alerts   |
| Install behaviour            | pnpm 12.14.0                                    | a scratch consumer installs the tag with scripts off and builds (docs/DELIVERY.md) |
| Package contents             | `git ls-tree` of the tag against `package.json` | only the folders in `"files"`, `LICENSE` and `package.json` reach a game           |

## Passes

The first full pass is due before v0.2.0 (docs/BACKLOG.md).

## Checks of the tools themselves

- **2026-11-20, the pre-commit secret scan.** A staged file with a fake AWS key and a fake GitHub
  token went through the hook's first version: lefthook passed `{root}` on literally, Docker
  mounted an empty volume, git in the container failed, and gitleaks reported "no leaks found".
  **Fixed:** `scripts/gitleaks-staged.sh` mounts `git rev-parse --show-toplevel` and allows it as
  a git `safe.directory`. Run again on the same staged file, the hook found the leak and refused
  the commit (exit 1). The probe file was removed and never pushed.
