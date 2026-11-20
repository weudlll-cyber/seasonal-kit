# Security policy

Every Seasonal game installs this kit, so a flaw here is a flaw in all of them. The kit is held
to a stricter standard than any single game (docs/DECISIONS.md, 2026-11-20).

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's private vulnerability reporting: open
the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public
issue for a security problem.

Include what is affected, how to reproduce it, and the impact you expect. Reports in English are
preferred.

## What happens next

- Triage within 7 days of the report: you get an answer whether the issue is accepted.
- Fix targets after triage: critical within 7 days, high within 30 days.
- A fix ships as a new tag (docs/RELEASING.md); each game takes it with the owner's approval. The
  advisory names the first fixed tag and is published once the fix is available.

## Supported versions

Only the latest tag receives security fixes.

## How the kit keeps its attack surface small

- **No runtime dependencies.** `dependencies` is empty; everything in `devDependencies` is a
  tool. There is one exception: an optional peer dependency on `vite`, used only for the types of
  `@seasonal/kit/vite`. That plugin runs in a game's build, never in a browser, and the game
  brings its own Vite.
- **No install scripts.** Games install the committed `dist/`; nothing is built or run on
  install (docs/DELIVERY.md). The kit's own installs run no script either
  (`pnpm-workspace.yaml` `ignoreScripts`, `.npmrc` `ignore-scripts`).
- **Exact pins and a committed lockfile.** Upgrades come only as reviewed Renovate PRs, never
  automerged.
- **Scans on every PR and on master:** CodeQL, osv-scanner (any finding fails), gitleaks over the
  full history; gitleaks also runs before every commit (lefthook.yml).
- **Protected master:** every change goes through a PR with every check green; no force push,
  no deletion. Third-party actions are pinned to full commit SHAs, workflow permissions are
  read-only by default.
- **No secrets.** The kit holds none and reads none. A season colour check reads the website's
  public `tokens.css` over HTTPS and nothing else.
