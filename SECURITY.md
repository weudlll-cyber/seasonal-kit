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
  tool. There are two exceptions, both optional peer dependencies pinned exactly, so the kit
  never brings a copy of its own:
  - `vite` 8.3.4, used only for the types of `@seasonal/kit/vite`. That plugin runs in a game's
    build, never in a browser, and the game brings its own Vite.
  - `react` 19.3.1 (since v0.4.0), the version both games pin, for `@seasonal/kit/react` only.
    The game brings its own React; a game or page without React never loads that entry.
- **No install scripts.** Games install the committed `dist/`; nothing is built or run on
  install (docs/DELIVERY.md). The kit's own installs run no script either
  (`pnpm-workspace.yaml` `ignoreScripts`, `.npmrc` `ignore-scripts`).
- **Exact pins and a committed lockfile.** Upgrades come only as reviewed Renovate PRs, never
  automerged.
- **Scans on every PR and on master:** CodeQL, osv-scanner (any finding fails), gitleaks over the
  full history; gitleaks also runs before every commit (lefthook.yml).
- **Protected master** (docs/DECISIONS.md K13): every change goes through a PR with every
  required check green on an up-to-date branch. No force push, no deletion, and admins are held
  to the same rules. Third-party actions are pinned to full commit SHAs, workflow permissions are
  read-only except the CodeQL job's `security-events: write`, and no checkout keeps the job's
  token on disk.
- **Checked frame messages.** The chat and call-view links accept a message only from the
  frame's own window, at the frame's origin, with the frame's `source` and well-formed fields.
  Anything else is ignored. They post only at that origin (never `'*'`), and only the fields the
  website's contract names: no token, key or text. Sign-in redirects go only to paths on this
  site (docs/security-pass.md).
- **Server sign-in (`@seasonal/kit/server`, since v0.8.0).**
  - Only the website's proxy may name a visitor: the TCP peer must be trusted (never a
    forwarding header), and the game's proxy secret must match in constant time. An empty
    secret refuses everyone.
  - A guest is never a member. A malformed header grants nothing: no role comes from anything
    but the role and can-host headers, and never `super_admin` or `security_admin`.
  - Return paths stay under the game's base path.
  - A TOTP step works once, and all candidates are compared in constant time. Recovery codes
    come from the system's random source and are kept only as HMAC-SHA-256 hashes with the
    game's recovery key (since v0.9.0, K20), so a leaked table cannot be searched without the
    key. A legacy SHA-256 hash still verifies; both are compared in constant time.
  - The username header is decoded as the website encodes it (K22); bytes that are not UTF-8
    give no identity, and so does a name with a control, line-separator or bidi character.
  - The kit stores nothing: secrets, sessions and accounts stay in each game's database.
  - Independently reviewed before release (docs/security-pass.md).
- **Development tools (`@seasonal/kit/devtools`, `@seasonal/kit/react/dev`, since v0.9.0).**
  A dev sign-in names only the game's own dev accounts, never an inherited key. The route stays
  behind the game's dev switch, its module is replaced by a stub in the production bundle
  (`devStubPlugin`), and the game's bundle test fails on any dev marker (`devMarkersIn`).
- **The website chat frame is sandboxed** in every game (K17): scripts, its own origin, forms
  and popups, nothing else. That limits what the frame may do (no top navigation, no downloads,
  no modals). It is not a wall: the website's own page, on the same origin with scripts, could
  lift it, so the sandbox guards against mistakes, not against the site itself.
- **No secrets.** The kit holds none and reads none. A season colour check reads the website's
  public `tokens.css` over HTTPS and nothing else. The server entry takes the game's secrets as
  arguments and never logs or keeps them.

## Binary assets

The only binary files are the five Luxora Grotesk woff2 files in `fonts/`. They are used exactly
as delivered and are not under the AGPL; see the licence note in
[fonts/README.md](fonts/README.md). Their sha256 values are recorded there.
`tests/fonts.test.ts` fails if a file changes, if one is added that `css/fonts.css` does not use,
or if `css/fonts.css` points at a file that is not shipped.
