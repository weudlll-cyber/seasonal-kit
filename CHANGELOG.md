# Changelog

All notable changes to `@seasonal/kit`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as [docs/RELEASING.md](docs/RELEASING.md)
applies it.

## [Unreleased]

## [0.3.0] - 2026-11-20

The game side of the website integration, framework-free (React wrappers: docs/BACKLOG.md 9).

### Added

- Website sign-in (`@seasonal/kit`):
  - `websiteSignInHref` (the game's sign-in route) and `websiteLoginHref` (its login hop), each
    with the page shown as `next`;
  - `signInAgain` and `signInAgainAfter(response, header)`: at most once a minute per tab and
    route, never without storage, and never to a route that is not a path on this site.
- The chat embed (`@seasonal/kit`):
  - `chatEmbedUrl(room, theme, path?)`: the embed page on this site, relative;
  - `connectChat`: the typed `seasonal-chat` / `seasonal-chat-host` link. It checks origin,
    window and `source` on every message, parses `ready`, `unread` and `resize` with all their
    fields, and ignores anything else. It sends `visible` (again on every `ready`) and `theme`,
    only at the chat's origin.
- The arrivals (`@seasonal/kit`): `createChatArrivals` (unread count and newest message) and
  `chatBarText`, for the docked strip and the phone chat bar.
- The call-view slot:
  - `@seasonal/kit/call.css`: `sk-call-slot` with `--collapsed`, `--strip` and `--phone`, at
    338 × 190, 267 × 150 under 760 px high, a 48 px column, and a 48 px phone strip;
  - `callSlot` and `CALL_SLOT` (`@seasonal/kit`): the same sizes, null while no call is linked;
  - `connectCall` (`@seasonal/kit`): the typed `seasonal-call` / `seasonal-call-host` link,
    with the same checks, for the linked call only. Nothing is framed yet: the site's page does
    not exist (docs/BACKLOG.md 8).
- The security pass's section on the message layers (`docs/security-pass.md`).

### Changed

- `docs/DELIVERY.md` records the install and build of the tag v0.2.0 itself, after the branch.
- `docs/DECISIONS.md`: K9–K13, the owner's confirmations (the five font weights, the first
  security pass, the licence, PR #4) and master's branch protection; K7 now comes before K8.
- `.claude/settings.json`: the kit's Claude Code permissions, explained in `CONTRIBUTING.md`.

### Migration, per game

- **Mini Games:** once it pins v0.3.0, it:
  - deletes `packages/ui/src/websiteSignIn.ts` and its test, and imports `websiteSignInHref`,
    `signInAgain` and `signInAgainAfter` from the kit. `signInAgainAfter` now takes the header:
    `signInAgainAfter(response, 'x-smg-session-ended')`. The loop guard's sessionStorage key
    becomes `sk.signInAgainAt:<route>`, so a guard set just before the update is forgotten once.
  - drops `fromChat` and the post from `apps/web/src/chat/useHostChatFrame.ts`. The hook becomes
    a thin wrapper over `connectChat`, which also re-sends `visible` on `ready`. For the
    website's room, `withTheme` gives way to `chatEmbedUrl('mini-games', theme)`. A host chat on
    another origin keeps its own address and passes its `origin`.
  - replaces `useArrivals` and `barText` (`apps/web/src/match/ChatDock.tsx`) and the unread
    count in `apps/web/src/round/FocusShell.tsx` with `createChatArrivals` and `chatBarText`.
  - may reserve the call slot (`call.css`, `callSlot`), hidden while no call is linked.
- **Bingo Royale:** once it pins v0.3.0, it:
  - drops `websiteSignInHref(signInPath, hash)` from `apps/web/src/account/WebsiteSignIn.tsx`
    for the kit's `websiteLoginHref(signInPath)`. `next` is now the page's path, query and hash.
    It no longer adds `#/` to an empty hash; the base path is the same page, the lobby.
  - builds `useWebsiteResign` on `signInAgain(signInPath)`, which adds the once-a-minute guard.
    Its `leavePage` seam gives way to `signInAgain`'s `go` argument.
  - builds the frame's `src` in `apps/web/src/shell/ChatDock.tsx` with
    `chatEmbedUrl(room, theme, path)`: relative now, the same page as its `origin + path`. It may
    take `connectChat` to follow the theme by `theme` without reloading the frame, and to show
    `unread`.
- **Seasonal Party:** takes the frame's chat link and the call slot from the kit when it adopts
  it (DECISIONS K4).

## [0.2.0] - 2026-11-20

### Added

- `@seasonal/kit/fonts.css` and the five Luxora Grotesk woff2 files in `fonts/` (DECISIONS K8):
  - Book 400 and Bold 700, the two faces the games use;
  - Regular 500, Italic 400 and Light Italic 300, as the website declares them.

  The files are byte-identical to the Mini Games, Bingo Royale and website copies; sha256 values
  are in `fonts/README.md` and checked in the tests. They are not under the AGPL (licence note in
  `fonts/README.md`).

- The first security pass (`docs/security-pass.md`).

### Migration, per game

- **Mini Games and Bingo Royale:** once a game pins v0.2.0, it:
  - imports `@seasonal/kit/fonts.css` in place of its own `packages/ui/src/fonts.css`;
  - drops its own copy of the font files (`assets/fonts/luxora-grotesk-*.woff2`);
  - keeps `assets/README.md`'s licence note for the files it still holds, if any.
- **Seasonal Party:** takes the font for its frame from the kit (DECISIONS K4). Its round font
  stays inside the play field.

## [0.1.0] - 2026-11-20

### Added

- `@seasonal/kit/tokens.css`: the 49 design tokens Bingo Royale and Mini Games share with equal
  values, light and dark. The season colours and the text on them are copied from the website.
  CI fails when they differ from the website's master, and checks every text token for WCAG AA
  in both themes.
- `@seasonal/kit/motion.css`: the win glow `sk-anim-win` and the reduced-motion rule.
- `@seasonal/kit`: the framework-free theme logic: `resolveTheme`, `storedTheme`, `storeTheme`,
  `systemTheme`, `applyTheme`, `onSystemThemeChange`, `shownTheme`, `onShownThemeChange`.
- `@seasonal/kit/vite`: `themeInit()`, which serves the early theme script
  (`browser/theme-init.js`) at the base path, so a game drops its own copy in `public/`. `vite` is
  an optional peer dependency.
- The project standards: SECURITY, CONTRIBUTING, CLAUDE.md, the review checklist and the
  security pass; the living docs; Renovate, osv-scanner and gitleaks; the CI and CodeQL
  workflows; the pre-commit hook (format, lint, gitleaks).

### Migration, per game

- **Mini Games:**
  - import `@seasonal/kit/tokens.css` and `motion.css` before its own;
  - drop the 49 shared tokens from `packages/ui/src/tokens.css`;
  - rename `smg-anim-win` to `sk-anim-win`;
  - build `useTheme` and `useShownTheme` on the kit's theme functions;
  - add `themeInit()` to its Vite plugins and delete `apps/web/public/theme-init.js`.
- **Bingo Royale:** the same, except:
  - it keeps its own `sbr-anim-draw` and the ball keyframes;
  - its `motion.css` keeps only those;
  - it has no `useShownTheme`.
- **Fonts:** each game keeps its own `fonts.css` and font files (docs/BACKLOG.md item 7).

### Security

- minimatch 10.2.6 (GHSA-g3hv-75wg-m249, moderate, only in ESLint's tooling) is forced to 11.0.9
  in `pnpm-workspace.yaml`. osv-scanner finds nothing.

## [0.0.1] - 2026-11-20

### Added

- The delivery probe: the four season colours (`css/tokens.css`) and the theme resolution
  (`resolveTheme`), with `dist/` committed ([docs/DELIVERY.md](docs/DELIVERY.md)).

[Unreleased]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/weudlll-cyber/seasonal-kit/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/weudlll-cyber/seasonal-kit/releases/tag/v0.0.1
