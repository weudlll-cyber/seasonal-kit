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

- `master` is protected: no direct push, no force push, no deletion. Every change is a branch
  (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`) and a pull request; it is
  merged once every required check is green and the owner has approved it, then deleted.
- Push after every commit, so the work is never only on one machine.
- Never force-push and never rewrite published history.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat(tokens): …`,
`fix(theme): …`, `docs: …`, `chore(ci): …`. Code, header comments, `dist/`, docs,
`CHANGELOG.md` ("Unreleased"), `docs/BACKLOG.md` and `docs/OPEN.md` change in the same commit.

The pre-commit hook formats the staged files with Prettier, lints them with ESLint and scans them
with gitleaks. Typecheck and tests run in `pnpm verify` and CI.

## Pull requests and review

Every pull request goes through the [code review checklist](docs/code-review-checklist.md); the
PR template links it. Releases follow [docs/RELEASING.md](docs/RELEASING.md).
