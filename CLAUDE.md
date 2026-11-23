# CLAUDE.md — Working rules for the kit

Every Seasonal game depends on this repository. It is held to a stricter standard than any
single game: security, hygiene, docs and tests (docs/DECISIONS.md, 2026-11-20).

## Language

Everything in this repository is English: code, comments, commit messages, docs.

## Source of truth

- Owner decisions live only in `docs/DECISIONS.md`, as dated facts. Do not reverse one without a
  task that says so; a new decision is added there in the same commit as the work it governs.
- The season colours come from the website (`seasonal-entertainment`
  `client/src/styles/tokens.css`, master). They are never edited here by hand; CI compares them.
- The source repositories (`seasonal-mini-games`, `seasonal-bingo-royale`,
  `seasonal-entertainment`, `seasonal-spirits` (Seasonal Party) and `seasonal-cases`) are
  read-only from here: read committed state with `git fetch` and `git show origin/<branch>:<path>`,
  never check out or write there. Something there that looks wrong is reported, not changed.
- Planning for the kit happens in the Seasonal Entertainment planning chat (DECISIONS K25); the
  decisions it makes are recorded here in docs/DECISIONS.md.

## What goes into the kit

- Only what a game uses: no exported item that no game uses, no file copied "for later".
- Shared CSS classes and keyframes are `sk-` prefixed, and so is every data attribute the kit
  sets or reads, as `data-sk-…` (tests/prefix.test.ts checks both; only `data-testid`, the
  testing library's, and `data-theme`, the website's, are left as they are, K31). Custom
  properties are not checked yet (BACKLOG 11). Game-specific parts
  (arena tokens, a game's own animations) stay in the game.
- No runtime dependencies. A new devDependency is pinned exactly and named, with its reason, in
  the PR.
- No install or build script runs on a game's install: `dist/` is compiled and committed
  (docs/DELIVERY.md).

## Hygiene in every change

- Every source file starts with a header: what it is, why it exists, where it came from (source
  repo, path and commit). Important blocks get inline comments.
- File ≤ 300 lines (a `*.test.ts` file 400, as eslint.config.js has it and docs/HANDBOOK.md
  says), function ≤ 60 lines, complexity ≤ 12. Split by responsibility.
- Before writing a helper, search for an existing one; name reused helpers in the report.
- No dead code, no unused variables or exports, no `console.log` outside the CLI scripts.
- Tests: every rule gets a test that would fail if it broke; coverage stays at 95 % or more of
  lines, branches and functions (CI fails below). No test written only for the number.
- Docs, header comments, `CHANGELOG.md`, `docs/BACKLOG.md` and `docs/OPEN.md` change in the same
  commit as the code. A closed backlog item moves to part two and names what closed it.

## Working cheaply

Owner decision of 2026-11-06: spend fewer tokens without testing or checking less. Owner decision
of 2026-11-23: these saving rules apply to every Seasonal project, this one included.

- Locally run only the unit tests of the files you changed, with the dot reporter, so a passing
  run prints almost nothing: `pnpm exec vitest run <files> --reporter=dot`. The full `pnpm verify`
  and the showcase run on GitHub through the pull request.
- Long logs (an install, a delivery proof, CI job logs) go to a file under `logs/` (git-ignored);
  read only the failing part (grep or tail), never the whole log.
- Screenshots are taken for the owner, not for checking: check with assertions, and open an image
  yourself only when an assertion cannot decide it. The showcase's `showcase/screens/` is
  git-ignored and never committed.
- Wait for CI with one blocking command (`gh pr checks <n> --watch`, or `gh run watch <id>`
  with its output in a file), not by polling.
- Read large files by searching first and reading only the lines needed.
- A flaky test is fixed at its cause the first time it flakes, not re-run. Never re-run a check
  on an unchanged tree.

## Git

- `master` is protected. Work on a branch, open a PR, merge only when every required check is
  green and the owner has approved; then delete the branch on origin and locally, so only
  `master` stays on origin. The one exception: during an unattended night, that night's
  morning-sheet branch (`night/<date>…`) stays on origin until its PR merges.
- Never force-push, reset published history or amend a pushed commit.
- Releases only as docs/RELEASING.md says (annotated tag on the merge commit).
- Run commands one at a time; no chains with `&&`, `;` or `|` unless a single tool needs a pipe.
- `.claude/settings.json` is edited only when a task names the change; `.claude/settings.local.json`
  never.

## Before reporting

Run `pnpm verify` and `pnpm build`. Report: files touched with lines before/after, what was
removed, what was reused, coverage, CI results, and what was noticed but left alone.
