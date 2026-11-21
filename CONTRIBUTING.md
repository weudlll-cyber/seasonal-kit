# Contributing

Everything in this repository is English: code, comments, commit messages and docs. The rules for
Claude Code are in [CLAUDE.md](CLAUDE.md); they apply to human contributors too.

## Setup

Node 22 or newer (see `.nvmrc`), pnpm 12.14.0 (`corepack enable`), and Docker for the
pre-commit secret scan.

```sh
pnpm install                 # runs no install script (pnpm-workspace.yaml ignoreScripts)
pnpm exec lefthook install   # the git hooks, by hand for that reason
pnpm verify                  # format check, lint, typecheck, tests with coverage gates
pnpm build                   # compiles src/ into dist/, which is committed
```

## Branching

- `master` is protected (DECISIONS K13): no direct push, no force push, no deletion, for admins
  too. Every change is a branch (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`)
  and a pull request; it is merged once every required check (`verify`, `osv-scanner`,
  `gitleaks`, `docs`, `analyze`) is green on a branch up to date with `master`, every
  conversation is resolved and the owner has approved it, then deleted.
- Push after every commit, so the work is never only on one machine.
- Never force-push and never rewrite published history.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat(tokens): …`,
`fix(theme): …`, `docs: …`, `chore(ci): …`. Code, header comments, `dist/`, docs,
`CHANGELOG.md` ("Unreleased"), `docs/BACKLOG.md` and `docs/OPEN.md` change in the same commit.

The pre-commit hook formats the staged files with Prettier, lints them with ESLint and scans them
with gitleaks. Typecheck and tests run in `pnpm verify` and CI.

## Claude Code permissions

[.claude/settings.json](.claude/settings.json) holds the permissions of the kit's Claude Code
session. Without them the owner would be asked to approve the same safe commands again and
again. The file is a copy of the `seasonal-spirits` project's settings, with these changes:

- **Allowed:** reading, globbing and grepping `seasonal-spirits`, which is only read from here,
  like the other source repositories. `gh api` on this repository only
  (`repos/weudlll-cyber/seasonal-kit/*`), to read check runs and to set and read master's branch
  protection. `gh release`, for the release notes of a tag.
- **Allowed since 2026-11-21:** `docker run --rm …`, a container that is removed when it ends.
  The security pass runs gitleaks and osv-scanner that way, with the images CI pins
  ([docs/security-pass.md](docs/security-pass.md)).
- **No longer allowed:** other `docker` commands and the PowerShell commands that find, stop
  and start processes. The kit runs no servers. The pre-commit hook's gitleaks container is
  started by lefthook, not by a Claude command.
- **Denied:** the blanket `gh api` deny is replaced by narrower ones. Denied are GraphQL
  (`gh api graphql`), every `DELETE` (`-X DELETE`, `-XDELETE`, `--method DELETE`,
  `--method=DELETE`) and any call that puts an option before the path (`gh api -…`). The path
  always comes first, so the allow rule above decides which repository a call can reach.

Every other rule, including the deny list for history rewrites, force pushes and `.env` files,
is the same as in `seasonal-spirits`. The file changes only when a task names the change
([CLAUDE.md](CLAUDE.md)). `.claude/settings.local.json` is never committed.

## Pull requests and review

Every pull request goes through the [code review checklist](docs/code-review-checklist.md); the
PR template links it. Releases follow [docs/RELEASING.md](docs/RELEASING.md).
