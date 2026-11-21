# Delivery

How a game gets the kit, and what was proven on 2026-11-20 before anything else was built.

## How a game pins the kit

```json
"dependencies": {
  "@seasonal/kit": "github:weudlll-cyber/seasonal-kit#vX.Y.Z"
}
```

- `vX.Y.Z` is a tag, the newest in the [CHANGELOG](../CHANGELOG.md). The tag is the version. A game moves only when its own `package.json` names a new tag, with
  the owner's approval (docs/DECISIONS.md K1).
- The repository is public, so no token is needed: not on the PC, not in CI.
- What a game receives is **compiled JavaScript and `.d.ts` files in `dist/`**, plus the CSS
  files, committed at each tag. Nothing is built and no script runs on install.

## The proof (2026-11-20, tag v0.0.1, commit 07a8484)

A scratch consumer outside every repository had `.npmrc` `ignore-scripts=true` and was installed
with `pnpm install --ignore-scripts`. Its toolchain was the games' own: pnpm 12.14.0,
Vite 8.3.4, Vitest 5.0.5 with jsdom 30.1.3, TypeScript 5.9.3.

| Step                                                       | Result                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                             | Worked. pnpm resolved the tag to the commit's tarball `https://codeload.github.com/weudlll-cyber/seasonal-kit/tar.gz/07a8484…`. The lockfile holds that URL, `gitHosted: true`, an `integrity` hash and `version: 0.0.1`. No warning and no script prompt.             |
| What landed in `node_modules/@seasonal/kit`                | Only `package.json`, `LICENSE` and the `"files"` folders (`css/`, `dist/`). Sources, tests and configs stay out.                                                                                                                                                       |
| `vite build` importing the CSS and the TS export           | Worked. The CSS was bundled into the page's stylesheet (`:root{--color-spring:#afb84e;…}`) and the TS export into the page's script.                                                                                                                                   |
| `tsc --noEmit` (Bundler resolution, `skipLibCheck: false`) | Worked. The types came from `dist/*.d.ts` through `exports["."].types`.                                                                                                                                                                                                |
| A Vitest test importing the TS export                      | Worked.                                                                                                                                                                                                                                                                |
| A Vitest test reading the CSS with `?raw`                  | Gave `''` under Vitest's default (`test.css: false`, which empties every CSS import). It gave the file's text with `test.css: true`. This is Vitest's behaviour, not the delivery's. A game whose tests read kit CSS turns `test.css` on, or reads the file from disk. |

Install scripts, a `prepare` script or a build on install were **not needed**, so none exists.

## The v0.1.0 entries (2026-11-20, branch `feat/design-basics` before its merge)

The same consumer was installed from the branch with scripts off. It had `base: '/games/consumer/'`
and `themeInit()` in its Vite plugins, `<script src="theme-init.js">` in its head, and imports of
`tokens.css`, `motion.css` and the theme functions.

| Step                        | Result                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite build`                | Worked. `dist/theme-init.js` was written beside `index.html`, unhashed, and the tag kept its relative `src`, so it resolves under the base. Vite prints `<script src="theme-init.js"> … can't be bundled without type="module"`, which is expected: the script must stay classic and unbundled, and the plugin supplies the file. |
| `tsc` over `src/`           | Worked against `dist/index.d.ts`.                                                                                                                                                                                                                                                                                                 |
| `tsc` over `vite.config.ts` | Vite's own `.d.ts` needs `@types/node` and an ES2024+ `lib`, which the scratch consumer lacked. No error came from the kit's `dist/vite.d.ts`. A game types its Vite config in its Node-side tsconfig, which has both.                                                                                                            |
| Vitest                      | Worked.                                                                                                                                                                                                                                                                                                                           |

## The v0.2.0 fonts (2026-11-20, branch `feat/fonts` before its merge)

A new scratch consumer installed the branch with `ignore-scripts=true`. It used Vite 8.3.4, the
default base, and imports of `@seasonal/kit/fonts.css` and `tokens.css`.

| Step                     | Result                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`           | Worked, with no script. `node_modules/@seasonal/kit/fonts/` holds the five woff2 files and the licence note.                                                                            |
| `vite build`             | Worked. Vite resolved each `url('../fonts/….woff2')` from the installed package and emitted all five as hashed assets (`dist/assets/luxora-grotesk-*-<hash>.woff2`, 20.98 to 26.42 kB). |
| The built CSS's `url()`s | All five point at an emitted file (`/assets/luxora-grotesk-*-<hash>.woff2`).                                                                                                            |
| The emitted bytes        | Each emitted file has the sha256 recorded in `fonts/README.md`.                                                                                                                         |

The same consumer then pinned the tag `#v0.2.0`, again with scripts off. The lockfile resolved it to
the merge commit's tarball (`609e93c`). `vite build` emitted the same five assets with the same
content hashes in their names, and every CSS `url()` resolved.

## The v0.3.0 website integration (2026-11-20, the tag itself)

A new scratch consumer outside every repository pinned `#v0.3.0` with `.npmrc`
`ignore-scripts=true` and `pnpm install --ignore-scripts`. Its toolchain was pnpm 12.14.0,
Vite 8.3.4, Vitest 5.0.5 with jsdom 30.1.3, TypeScript 5.9.3 and @types/node 22.20.5. It was
deleted afterwards.

| Step                                                       | Result                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                             | Worked, with no script. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/0862694…`, `gitHosted: true`, an `integrity` hash, `version: 0.3.0`).                                                                                                                                                                            |
| What landed in `node_modules/@seasonal/kit`                | `package.json`, `LICENSE`, `README.md`, `browser/`, `css/` (now with `call.css`), `dist/` (with `websiteSignIn`, `chatEmbed`, `chatArrivals`, `callView`, `callSlot`, `frameMessages`) and `fonts/`. No source, test or config.                                                                                                                         |
| `vite build`                                               | Worked. The page imported `@seasonal/kit/call.css` and used every new root export. The stylesheet holds every `sk-call-slot` rule, the low window's 267 × 150 included. The script holds the chat and call links (`seasonal-chat-host`, `seasonal-call-host`), the embed address, the login hop and the sign-in guard's key.                            |
| `tsc --noEmit` (Bundler resolution, `skipLibCheck: false`) | Worked against `dist/*.d.ts`.                                                                                                                                                                                                                                                                                                                           |
| A Vitest test (jsdom) importing the new exports            | Worked, 4 tests. They built the sign-in links, refused a header naming `//evil.example`, linked a chat frame (`visible` posted at the page's origin; an `unread` from another origin dropped, the same one from the frame's origin heard), linked a call, counted arrivals, sized the slot (null without a call id), and read the installed `call.css`. |

An entry module's unused exports are dropped from a Vite app build. The first build kept only
what the page called, so the consumer called every export before the bundle was read.

## The v0.4.0 screen building blocks (2026-11-21, the tag itself)

A new scratch consumer outside every repository pinned `#v0.4.0` with `ignore-scripts=true`,
with React 19.3.1 and the games' toolchain (Vite 8.3.4, Vitest 5.0.5 with jsdom 30.1.3,
TypeScript 5.9.3, @testing-library/react 16.3.3). Its page rendered `BackLink`, `ThemeToggle`
and `DockedScreen` with `WebsiteChatFrame` inside, and used every other `@seasonal/kit/react`
export, under `data-sk-game="mini-games"`.

| Step                                                       | Result                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                             | Worked, with no script. The lockfile resolved the tag to the merge commit's tarball (`a35bc1f`, `version: 0.4.0`).                             |
| `vite build`                                               | Worked: `tokens.css`, `fit.css`, `dock.css`, `shell.css` and `call.css` in the stylesheet, the React parts in the script.                      |
| `tsc --noEmit` (Bundler resolution, `skipLibCheck: false`) | Worked against `dist/react/*.d.ts`.                                                                                                            |
| A Vitest test (jsdom) rendering the page at 390 × 844      | **Failed:** `DockedScreen` read `window.visualViewport.height`, which jsdom does not have. **Fixed in v0.4.1**, whose own proof follows below. |

## The v0.4.1 fix (2026-11-21, the tag itself)

The same consumer pinned `#v0.4.1`, with scripts off. The lockfile resolved it to the merge
commit's tarball (`7791e8a`, `version: 0.4.1`). `vite build` and `tsc` worked, and the Vitest
test passed at 390 × 844. It checked the back link (`/games`), the toggle's name, the frame's
address with the page's theme, the hidden call slot, and the phone bar's "Chat · Ana: gg" with
its count. The consumer was deleted afterwards.

One rule showed itself on the way. A game's own chat room reports arrivals from **inside** the
dock (the `chat` it passes), as Mini Games' room does. Content above the dock gets no arrivals
from `useDockArrivals`.

## The v0.5.0 frames (2026-11-21, the tag itself)

A new scratch consumer pinned `#v0.5.0`, with scripts off and the same toolchain. The lockfile
resolved it to the merge commit's tarball (`929c997`, `version: 0.5.0`). The page put
`StartCard`, then `ResultFrame` (`fitted`), inside `DockedScreen`, and imported `frames.css`,
`dock.css` and `fit.css`.

- `vite build` worked, with both frames' rules in the stylesheet.
- `tsc` worked.
- The Vitest test at 390 × 844 passed. It checked the winter card, "Opens in 3 s", then the
  result's headline at scale 1, and the same chat element through the switch.

The consumer was deleted afterwards.

## The v0.6.0 game bar (2026-11-21, the tag itself)

A new scratch consumer pinned `#v0.6.0`, with scripts off and the same toolchain. The lockfile
resolved it to the merge commit's tarball (`bd5df31`, `version: 0.6.0`). The page used
`GameBar` with `usePanels`, `useFullscreen` and `useFocusMode`, `PhaseStrip`, and `clockText`
from the package root, with `bar.css`, `shell.css` and `fit.css`.

- `vite build` worked.
- `tsc` worked.
- The Vitest test passed. It checked the focus mark on `<html>`, "9:50 left", "Chat2 unread",
  no full-screen toggle in jsdom, "Join · now until 0:30", and the chat panel opening.

The consumer was deleted afterwards.

## The showcase is no delivery

`showcase/`, `playwright.config.ts` and the Playwright dev dependencies (v0.7.0) stay in the
repository. `"files"` leaves them out, so a game receives none of them.

## The v0.7.0 tag (2026-11-21, the tag itself)

A new scratch consumer pinned `#v0.7.0`, with scripts off and the same toolchain. The lockfile
resolved it to the merge commit's tarball (`6b0d9a7`, `version: 0.7.0`).

- **Contents:** the installed package holds `package.json`, `LICENSE`, `README.md`, `browser/`,
  `css/`, `dist/` and `fonts/`; no `showcase/` and no Playwright config.
- **Build and types:** `vite build` and `tsc` worked.
- **Test:** the Vitest test at 390 × 844 found `--sk-visible-height: 600px` on `<html>` and no
  height on the dock's box.

The consumer was deleted afterwards.

## The v0.8.0 server entry (2026-11-21, the tag itself)

A new Node-side scratch consumer pinned `#v0.8.0`, with scripts off, TypeScript 5.9.3 (NodeNext,
`skipLibCheck: false`), Vitest 5.0.5 and @types/node 22.20.5, and no React or Vite. The lockfile
resolved it to the merge commit's tarball (`30ce80a`, `version: 0.8.0`).

- `tsc` worked against `dist/server/*.d.ts`.
- The Vitest file passed: 3 tests, covering these checks:
  - a sign-in decided by peer, secret and headers, with a joined role header refused;
  - `safeNext` refusing `..`, and the login hop's nesting;
  - a TOTP code working once;
  - a hex recovery code matching in upper case;
  - the limiter refusing the second request;
  - `SessionEnds` reporting a listener's error to `onError`.

The consumer was deleted afterwards.

## The v0.9.0 header, dev tools and recovery key (2026-11-22, the tag itself)

A new scratch consumer pinned `#v0.9.0`, with scripts off: React and React DOM 19.3.1,
TypeScript 5.9.3 (NodeNext, `skipLibCheck: false`), Vitest 5.0.5 with jsdom 30.1.3, and
@types/node 22.20.5. The lockfile resolved the tag to the merge commit's tarball (`087e5b0`,
`version: 0.9.0`).

- `tsc` worked against `dist/react`, `dist/react/dev`, `dist/devtools` and `dist/server`.
- Three tests passed:
  - `AppHeader` with an account and `DevSignIn` in its slot rendered "Ana (host)" and the first
    dev marker (jsdom);
  - in Node, `devSignInAccount` named the host, and a hex recovery code keyed with
    `recoveryHash` matched in upper case with spaces and a dash;
  - `@seasonal/kit/header.css` resolved to a shipped file.
- Two things it found, both fixed in v0.9.1 or recorded (docs/AUDIT-2026-11-22.md):
  - in a jsdom test, `recoveryHash` refused a Node `Buffer` as the key, because
    `instanceof Uint8Array` fails across realms. Fixed in v0.9.1 (`types.isUint8Array`);
  - `ThemeToggle`, and so the header, cannot be rendered on a server (`window`). Both games
    render on the client only; recorded.

The consumer was deleted afterwards.

## What this means for the kit

- `dist/` is committed and must equal a fresh `pnpm build`; CI fails otherwise
  (`.github/workflows/ci.yml`, job `verify`).
- `package.json` `"files"` decides what a game receives: `browser/`, `css/` and `dist/` since
  v0.1.0, and `fonts/` since v0.2.0 (`css/call.css` since v0.3.0 is in `css/`). A new folder that
  a game needs goes in there.
  Two pairs of folders must ship together: `css/fonts.css` points at `../fonts/`, and
  `dist/vite.js` reads `../browser/theme-init.js` from the installed package.
- `exports` names every entry. Types come first, so TypeScript finds the `.d.ts`.
- A game's lockfile pins the commit, not just the tag. A tag moved after the fact would not reach
  a game unnoticed: the integrity hash would no longer match. Tags are never moved
  (docs/RELEASING.md).
