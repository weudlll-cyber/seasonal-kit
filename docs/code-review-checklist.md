# Code review checklist

Used for every pull request ([CONTRIBUTING.md](../CONTRIBUTING.md)); linked from the PR template.
Adapted from Mini Games' checklist (seasonal-mini-games `docs/code-review-checklist.md` at
`93ed780`) to a library every game depends on.

1. Implements an owner decision ([DECISIONS.md](DECISIONS.md)) or a backlog item
   ([BACKLOG.md](BACKLOG.md)); nothing beyond it.
2. Every new export is used by at least one game (named in the PR); nothing game-specific moved in.
3. Shared CSS is `sk-` prefixed; no game's arena token or own animation in the kit.
4. No runtime dependency; any new devDependency pinned exactly and justified; no install script.
5. No dead code, no duplicate helper (searched for an existing one; reused helpers named).
6. Tests: new behaviour covered, a failing-before test for each bug fix; coverage ≥ 95 %.
7. File headers name the source (repo, path, commit); docs, CHANGELOG "Unreleased", BACKLOG.md
   and OPEN.md updated in the same PR.
8. `dist/` rebuilt and committed; it matches the source (CI checks).
9. Breaking change (a renamed or removed token, class, export)? Then a major version in the
   CHANGELOG and a migration note per game.
10. No secrets, no `console.log` outside `scripts/`, no TODO without a BACKLOG entry.
