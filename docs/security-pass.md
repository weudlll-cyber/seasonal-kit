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

### 2026-11-20 — the first pass, before v0.2.0 (branch `feat/fonts`, PR #3)

| Scan                         | Tool and command                                                                                  | Result                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets in the whole history | gitleaks 8.30.1 (CI's image), `git /repo --log-opts=--all --redact`                               | No leaks. 6 commits with a patch scanned (8 commits in all refs, merges included).                                                                                                   |
| Dependencies                 | osv-scanner 2.7.0 (CI's image), `scan source --config=osv-scanner.toml --lockfile=pnpm-lock.yaml` | No issues in 237 packages. The minimatch override still holds.                                                                                                                       |
| Code                         | CodeQL (javascript-typescript)                                                                    | The `analyze` check and the code-scanning check green on PRs #1 and #2 and on master's merge commits. The alert list itself was not read: `gh api` is not permitted in this session. |
| Install behaviour            | pnpm 12.14.0, scratch consumer with `ignore-scripts=true`                                         | The branch installs with no script. `vite build` emits the five woff2 files; every CSS `url()` resolves (docs/DELIVERY.md).                                                          |
| Package contents             | the installed package                                                                             | `package.json`, `LICENSE`, `README.md`, `browser/`, `css/`, `dist/`, `fonts/` (with its licence note). No source, test or config.                                                    |
| Binary assets                | sha256 of the five woff2 files, compared with the Mini Games, Bingo Royale and website copies     | Byte-identical everywhere (fonts/README.md). The kit's test keeps them so.                                                                                                           |

No finding, so nothing was fixed.

## Checks of the tools themselves

- **2026-11-20, the pre-commit secret scan.** A staged file with a fake AWS key and a fake GitHub
  token went through the hook's first version: lefthook passed `{root}` on literally, Docker
  mounted an empty volume, git in the container failed, and gitleaks reported "no leaks found".
  **Fixed:** `scripts/gitleaks-staged.sh` mounts `git rev-parse --show-toplevel` and allows it as
  a git `safe.directory`. Run again on the same staged file, the hook found the leak and refused
  the commit (exit 1). The probe file was removed and never pushed.
- **2026-11-20, osv-scanner on the first master push.** One finding: GHSA-g3hv-75wg-m249,
  minimatch 10.2.6 (ReDoS in glob patterns, CVSS 6.9), pulled only by typescript-eslint 8.71.2.
  It is not exploitable here: only the repository's own globs, and nothing a game receives. Mini
  Games accepts the same advisory below CVSS 7. The kit fails on any finding, so instead of an
  ignore entry it is **fixed**: an override to 11.0.9, the fixed line ESLint already uses. Lint
  and the tests pass, and osv-scanner finds nothing.
