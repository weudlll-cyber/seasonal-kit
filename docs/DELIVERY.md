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

## The peer ranges (since v0.11.1, DECISIONS K37)

The kit's two peers are optional: `react` (for `@seasonal/kit/react`) and `vite` (the types of
`@seasonal/kit/vite`). A game brings its own; the kit never installs a copy.

- **A peer is a caret range** from the version the kit is tested with: `react` `^19.3.1`,
  `vite` `^8.3.4`. A game may run any later minor or patch of the same major.
- **The kit tests with exact versions**: its devDependencies pin one version each, and that
  version must meet the range (tests/renovate.test.ts).
- **Why:** up to v0.11.0 the peers were exact. npm treats a peer that does not match as an
  error, optional or not: a scratch consumer with Vite 8.3.5 could not install `#v0.11.0` with
  npm (`ERESOLVE`, `peerOptional vite@"8.3.4"`, 2026-11-23).
- **A range's floor rises** only in a reviewed change with a CHANGELOG note per game. A new
  major widens the range (`^19.3.1 || ^20.0.0`) until no game is on the old one
  ([RELEASING.md](RELEASING.md)).

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

## The v0.9.1 patch (2026-11-22, the tag itself)

A scratch consumer pinned `#v0.9.1`, with scripts off: TypeScript 5.9.3 (NodeNext,
`skipLibCheck: false`) and Vitest 5.0.5 with jsdom 30.1.3. The lockfile resolved it to the merge
commit's tarball (`4d57a7e`, `version: 0.9.1`).

- `tsc` worked with the new `FitGame` type.
- One jsdom test passed: a sign-in route with a tab throws, and a Node `Buffer` key works in
  `recoveryHash` inside jsdom (the realm fix).

The consumer was deleted afterwards.

## The v0.10.0 focus fixes and API cleanup (2026-11-22, the tag itself)

A scratch consumer pinned `#v0.10.0`, with scripts off: React and React DOM 19.3.1, Vite 8.3.4,
TypeScript 5.9.3 (NodeNext, `skipLibCheck: false`), Vitest 5.0.5 with jsdom 30.1.3, and
@types/node 22.20.5. The lockfile resolved the tag to the merge commit's tarball (`36a72cf`,
`version: 0.10.0`).

- `tsc` worked with the new names: `RequestHeaders`, `BackLinkProps`, `DevStubOptions`, and
  `devStubPlugin({ devModule, stub })`. The removed ones failed as the CHANGELOG's migration
  says: `Headers`, the positional `devStubPlugin`, and `'expand'` as a `BarIconName`
  (`@ts-expect-error` on each).
- Four tests passed:
  - the types above, used at run time;
  - `AppHeader` with `signIn.href`: the toggle is the header's last element, and the menu closes
    when the focus leaves it (jsdom);
  - `GameBar` rendered with `time={null}`;
  - `@seasonal/kit/shell.css` resolved to a shipped file with `--sk-focus-ring` and
    `:focus-visible`.

The consumer was deleted afterwards.

## The v0.10.1 noted items (2026-11-22, the tag itself)

A scratch consumer pinned `#v0.10.1`, with scripts off, the same toolchain as for v0.10.0. The
lockfile resolved the tag to the merge commit's tarball (`76bd872`, `version: 0.10.1`).

- `tsc` worked, `useDisclosure`'s `dismiss` included.
- Five tests passed:
  - in Node, with no `window`: `renderToString` of `ThemeToggle` (`data-sk-theme-now="light"`)
    and of `AppHeader` (`data-sk-open="false"`);
  - in Node: `identityFrom` decoded a UTF-8 name ("Jürgen") and a steps header;
  - in jsdom: `ChatDock` with `data-sk-view`, its live region empty at first and then "1 unread
    chat message";
  - `useDisclosure`'s `dismiss` closed the panel;
  - `DevSignIn` closed on a press outside.

The consumer was deleted afterwards.

## The v0.11.0 games' requests, season feed and open rounds (2026-11-23, the tag itself)

A scratch consumer pinned `#v0.11.0`, with scripts off, the same toolchain as for v0.10.0. The
lockfile resolved the tag to the merge commit's tarball (`ab03151`, `version: 0.11.0`).

- `tsc` worked with the new names: `openRoundsPage`, `seasonFeedReader`, `RateRule` as a
  function, `MIN_POINTER_TARGET`, `BarToggle`, `ResultFrame`'s `panel`, `useDockReserve`,
  `OriginChatFrame`.
- Seven tests passed. In Node:
  - `openRoundsPage` kept the good round and left out the one with an `http` join URL;
  - `seasonFeedReader` read the feed through the passed fetch, then kept it on a 503 and named
    the failure;
  - a rate rule given as a function applied its new limit at once;
  - the shipped CSS has the two new floors, the back link's gap and the measured fold.

  In jsdom:
  - a `GameBar` toggle said `aria-pressed` and switched on a click;
  - `ResultFrame` as a panel rendered an `h3` and no `h1`;
  - `useDockReserve` gave 190 px at 1280 × 800;
  - `OriginChatFrame` framed `http://localhost:5380` and nothing for a production origin.

The consumer was deleted afterwards.

## The v0.11.1 peer ranges, with pnpm and with npm (2026-11-23, the tag itself)

Two scratch consumers pinned `#v0.11.1`, both with `ignore-scripts=true`. Their toolchain was
React and React DOM 19.3.1, TypeScript 5.9.3 (NodeNext, `skipLibCheck: false`), Vitest 5.0.5 with
jsdom 31.0.1, and @types/node 22.20.5. Each typechecked a `vite.config.ts` that typed the kit's
`themeInit()` as its own Vite's `Plugin`, and ran the same three tests:

- the installed kit is `0.11.1`, with peers `react` `^19.3.1` and `vite` `^8.3.4`, and the Vite
  in use is the consumer's own;
- `themeInit()` runs under that Vite (`seasonal-kit:theme-init`);
- `renderToString` of `ThemeToggle` with that React; `MIN_POINTER_TARGET` is 24; a
  `RateLimiter` lets one request pass and refuses the next.

| Consumer                 | Install                                                                                                                                                                                          | `tsc`  | Tests    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.4 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/acd011a…`, `gitHosted: true`, an `integrity` hash, `version: 0.11.1`).                                    | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked, with no `ERESOLVE`. `package-lock.json` holds `version: 0.11.1` at `…seasonal-kit.git#acd011a…`; `npm ls` shows the kit's `react` and `vite` deduped to the consumer's 19.3.1 and 8.3.5. | Worked | 3 passed |

Earlier the same day, `#v0.11.0` next to Vite 8.3.5 had failed with npm (`ERESOLVE`,
`peerOptional vite@"8.3.4"`), which is what v0.11.1 fixes. Both consumers were deleted
afterwards.

## The v0.12.0 additions, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.12.0` (merge commit `01dd712`), both with `ignore-scripts=true`.
Their toolchain was React and React DOM 19.3.1, TypeScript 5.9.3 (NodeNext,
`skipLibCheck: false`), Vitest 5.0.5 with jsdom 31.0.1 and @types/node 22.20.5. Each ran `tsc`
and the same four tests:

- the installed kit is `0.12.0` and its `bar.css` has `.sk-back-words`;
- `GameBar` with `back={{ websiteMode: true }}` has the back link first, named "Seasonal
  Entertainment", and a `prefs` button; without the prop there is no back link;
- `useFitScale(…, { afterFonts })` listens to `document.fonts` only when on (`FitOptions` typed
  from the root entry);
- `DockedScreen withoutChat` has no dock, and `useDockSight` in a phone `ChatDock` says `false`
  and then `true` once the sheet is open (`DockSightValue` typed).

| Consumer                 | Install                                                                                                                                                                                                                                                  | `tsc`  | Tests    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.8 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/01dd712…`, `gitHosted: true`, an `integrity` hash).                                                                                                               | Worked | 4 passed |
| npm 11.19.0, Vite 8.3.5  | Worked, with no `ERESOLVE`. `package-lock.json` holds the kit at `…seasonal-kit.git#01dd712…`; `npm ls` shows its `react` and `vite` deduped to the consumer's 19.3.1 and 8.3.5. 8.3.8 is the newest 8.3.x, so no later patch than the kit's own exists. | Worked | 4 passed |

Both consumers were deleted afterwards.

## The v0.13.0 additions, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.13.0` (merge commit `f93dcf0`), both with `ignore-scripts=true`,
with the toolchain of v0.12.0's proof (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false`, Vitest 5.0.5 with jsdom 31.0.1). Each ran `tsc` and three tests:

- the installed kit is `0.13.0`; its `tokens.css` has the `:where(:root)` text floor default and
  its `call.css` the `sk-call-frame` rule;
- `AppHeader` with `foldBelow={960}` in an 800 px window says `data-sk-folded="true"`;
- a `GameBar` press button calls its handler; `callEmbedUrl(7, 'dark')` is
  `/embed/call/7?theme=dark`; in a phone `DockedScreen` with call id 7 the frame is
  `/embed/call/7?theme=…` with `allow="autoplay; fullscreen"`, a game's `useOpenDockChat()` button
  opens the chat sheet, and the view's `ended` message hides the slot.

| Consumer                 | Install                                                                                                                                                                  | `tsc`  | Tests    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.8 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/f93dcf0…`, `gitHosted: true`).                                                    | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked, with no `ERESOLVE`. `npm ls` shows the kit `0.13.0` at `…seasonal-kit.git#f93dcf0…` with its `vite` deduped to the consumer's 8.3.5 (8.3.8 is the newest 8.3.x). | Worked | 3 passed |

The first run of the pnpm consumer failed one assertion, which was the consumer's own: it
expected `theme=auto` in the frame's address, but the page's shown theme was `light` once the
test had stubbed `matchMedia` (the kit's `useShownTheme`, as for the chat frame). The assertion
now accepts `light` or `auto`; nothing in the kit changed. Both consumers were deleted afterwards.

## The v0.14.0 token prefix, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.14.0` (merge commit `8eb1018`), both with `ignore-scripts=true`,
with the toolchain of the v0.12.0 and v0.13.0 proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false`, Vitest 5.0.5 with jsdom 31.0.1). Each ran `tsc` and four tests:

- the installed kit is `0.14.0`;
- the ten shipped stylesheets (`tokens`, `shell`, `bar`, `dock`, `frames`, `header`, `fit`, `call`,
  `motion`, `fonts`) declare and read only `--sk-…` custom properties, apart from `--fit`;
- the new names are in the installed `tokens.css` (`--sk-color-spring`, `--sk-color-text`,
  `--sk-space-2`, `--sk-hit-target`, `--sk-gutter`), `--color-text` is not declared, and `shell.css`
  and `bar.css` read `var(--sk-color-text)` and `var(--sk-hit-target)`;
- `GameBar` and `ThemeToggle` still render, `MIN_POINTER_TARGET` is 24.

| Consumer                 | Install                                                                                                                                                                  | `tsc`  | Tests    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.8 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/8eb1018…`, `gitHosted: true`, an `integrity` hash).                               | Worked | 4 passed |
| npm 11.19.0, Vite 8.3.5  | Worked, with no `ERESOLVE`. `npm ls` shows the kit `0.14.0` at `…seasonal-kit.git#8eb1018…` with its `vite` deduped to the consumer's 8.3.5 (8.3.8 is the newest 8.3.x). | Worked | 4 passed |

This proof reads the shipped files and renders two components; it does not render a game's own CSS
against the new names, which each game does in its own adoption PR (CHANGELOG [0.14.0], "Migration,
per game"). Both consumers were deleted afterwards.

## The v0.15.0 failure brake and result frame, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.15.0` (merge commit `e6943ad`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false`, Vitest 5.0.5 with jsdom 31.0.1). Each ran `tsc` and five tests in two files:

- **In Node, no DOM** (`@seasonal/kit/server`): `FailureBrake` looks without counting or holding a
  key, brakes at the third failure and not before, keeps another key free, and lifts once the
  failures have aged out of the window; with a bound of two keys a third key is braked while the
  held keys keep their counts; a broken rule throws `RangeError`; `RateLimiter` still works.
- **In jsdom** (`@seasonal/kit/react`): the installed kit is `0.15.0` and its `frames.css` has the
  `[data-sk-reveal='none']` rule; a `ResultFrame` with a reveal has its box and no
  `data-sk-reveal`, one without has `data-sk-reveal="none"` and no reveal box; with `middle` and
  `more` the children are `sk-result-first`, `sk-result-middle`, `sk-result-more` in that order.

| Consumer                 | Install                                                                                                                                                                  | `tsc`  | Tests    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.8 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/e6943ad…`, `gitHosted: true`).                                                    | Worked | 5 passed |
| npm 11.19.0, Vite 8.3.5  | Worked, with no `ERESOLVE`. `npm ls` shows the kit `0.15.0` at `…seasonal-kit.git#e6943ad…` with its `vite` deduped to the consumer's 8.3.5 (8.3.8 is the newest 8.3.x). | Worked | 5 passed |

Both consumers were deleted afterwards.

## The v0.16.0 start card fit option, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.16.0` (merge commit `6801202`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false` and `exactOptionalPropertyTypes`, Vitest 5.0.5 with jsdom 31.0.1). Each ran
`tsc` and three tests in one file, in jsdom (`@seasonal/kit/react`): the installed kit is `0.16.0`;
a `StartCard` without `fit` does not listen for web fonts; with `fit={{ afterFonts: true }}` it
listens once and lets go on unmount.

| Consumer                 | Install                                                                                                   | `tsc`  | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/6801202…`).        | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.16.0` at `…seasonal-kit.git#6801202…` with the consumer's `vite` 8.3.5. | Worked | 3 passed |

Both consumers were deleted afterwards.

## The v0.17.0 phone sheet cap, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.17.0` (merge commit `72ec78d`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false` and `exactOptionalPropertyTypes`, Vitest 5.0.5). Each ran `tsc` and two tests
in one file, in Node: the installed kit is `0.17.0` and `DockedScreen` imports from
`@seasonal/kit/react`; the installed `@seasonal/kit/dock.css` (resolved through the package's
`exports`) has the sheet's `max-height` reading `--sk-visible-height` with `100dvh` as the
fallback, the unchanged `height: min(60dvh, 30rem)`, and the three names the cap shares with the
layout. The consumers read the shipped file; the layout itself is measured in the kit's own
showcase (`showcase/sheet.spec.ts`), which no game's install runs.

| Consumer                 | Install                                                                                                   | `tsc`  | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/72ec78d…`).        | Worked | 2 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.17.0` at `…seasonal-kit.git#72ec78d…` with the consumer's `vite` 8.3.5. | Worked | 2 passed |

Both consumers were deleted afterwards.

## The v0.18.0 result frame fit option, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.18.0` (merge commit `536477e`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false` and `exactOptionalPropertyTypes`, Vitest 5.0.5 with jsdom 31.0.1). Each ran
`tsc` and three tests in one file, in jsdom (`@seasonal/kit/react`): the installed kit is `0.18.0`;
a `fitted` `ResultFrame` without `fit` does not listen for web fonts; with
`fit={{ afterFonts: true }}` it listens once and lets go on unmount.

| Consumer                 | Install                                                                                                   | `tsc`  | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/536477e…`).        | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.18.0` at `…seasonal-kit.git#536477e…` with the consumer's `vite` 8.3.5. | Worked | 3 passed |

Both consumers were deleted afterwards.

## The v0.19.0 step badges in the header, with pnpm and with npm (2026-11-24, the tag itself)

Two scratch consumers pinned `#v0.19.0` (merge commit `19f0208`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false` and `exactOptionalPropertyTypes`, Vitest 5.0.5 with jsdom 31.0.1). Each ran
`tsc` and three tests in one file: the installed kit is `0.19.0`; a `Step[]` typed with
`import type { Step } from '@seasonal/kit/server'` (the type the server entry still exports) is
passed as `account.steps` to `AppHeader` from `@seasonal/kit/react`, and in jsdom the chip draws
the website's icon with its step's name and drops the address on another host; the installed
`dist/stepShape.js` holds no Node API, and the installed `dist/react/AppHeader.js` imports it, not
anything under `/server/`.

| Consumer                 | Install                                                                                                   | `tsc`  | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/19f0208…`).        | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.19.0` at `…seasonal-kit.git#19f0208…` with the consumer's `vite` 8.3.5. | Worked | 3 passed |

Both consumers were deleted afterwards.

## The v0.19.1 clean-up, with pnpm and with npm (2026-11-25, the tag itself)

Two scratch consumers pinned `#v0.19.1` (merge commit `1dd81a6`), both with `ignore-scripts=true`,
with the toolchain of the earlier proofs (React 19.3.1, TypeScript 5.9.3 NodeNext with
`skipLibCheck: false` and `exactOptionalPropertyTypes`, Vitest 5.0.5). Each ran `tsc` and three
tests in one file: the installed kit is `0.19.1`; **every one of the 112 files of the installed
`dist/` has the sha256 of the same file in v0.19.0** (a manifest taken from the v0.19.0 tag's
build before the night's work), so the public API is unchanged by construction; the installed
`css/header.css` has the folded chip's wrapping rule; `AppHeader` and the server entry's `Step`
type still import and compile.

| Consumer                 | Install                                                                                                   | `tsc`  | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/1dd81a6…`).        | Worked | 3 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.19.1` at `…seasonal-kit.git#1dd81a6…` with the consumer's `vite` 8.3.5. | Worked | 3 passed |

Both consumers were deleted afterwards.

## The v0.20.0 `sideEffects` field and a consumer's bundle, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.20.0` (merge commit `61022ec`), both with `ignore-scripts=true`
(React 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5, **Vite 8.3.5 building the consumer**). Each
has a one-file entry that imports three of the kit's stylesheets (`tokens.css`, `header.css`,
`bar.css`) and one value (`MIN_POINTER_TARGET`), ran `tsc`, `vite build` and four tests on what the
build wrote:

- the installed package is `0.20.0` and says `"sideEffects": ["**/*.css"]`;
- **the bundle keeps the CSS**: the built stylesheet holds `--sk-color-spring`, `.sk-header-chip`
  and `.sk-bar-button`, though no JavaScript names any of them;
- **and drops the JavaScript that was not used**: the built script (0.69 kB) has no `watchFit`,
  `seasonFeedReader` or `linkFrame`;
- the installed `CallFrame.js` carries `strict-origin` and `GameBar.js` carries `aria-controls`.

| Consumer                 | Install                                                                                                   | `tsc`  | Build | Tests    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------ | ----- | -------- |
| pnpm 12.14.0, Vite 8.3.5 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/61022ec…`).        | Worked | Built | 4 passed |
| npm 11.19.0, Vite 8.3.5  | Worked. `npm ls` shows the kit `0.20.0` at `…seasonal-kit.git#61022ec…` with the consumer's `vite` 8.3.5. | Worked | Built | 4 passed |

Both consumers were deleted afterwards.

## The v0.21.0 server parts and the shipped backup script, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.21.0` (merge commit `f8ae818`), both with `ignore-scripts=true`
(React 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5, `@types/node` 22.20.5), ran `tsc` and five
tests on the installed package:

- it is `0.21.0`, `ops/backup.sh`, `pull-backups.sh` and `pull-backups.ps1` are in it and `ops/test/`
  is not;
- **`ops/backup.sh` is sourced from the installed package** (`SK_BACKUP_SOURCE_ONLY=1 source … && usage`)
  and prints its help text (`backup`, `restore`, `drill`); run as a script, `help` prints "Usage:
  ops/backup.sh";
- `guardedFetch()` refuses `http://` and an IPv4-mapped loopback written `[::ffff:7f00:1]`, and
  `isPublicAddress` judges `::ffff:10.0.0.1` private;
- `sessionCookie` gives `__Host-x_session` and a `Max-Age` of 604800 for 7 days; `writeCheck` refuses a
  write naming neither `Origin` nor `Sec-Fetch-Site`; `securityHeaderSet` has `script-src 'self'` and no
  HSTS; `readiness` answers 200 and `HEALTH_PATHS.ready` is `/readyz`.

| Consumer     | Install                                                                                            | `tsc`  | Tests    |
| ------------ | -------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/f8ae818…`). | Worked | 5 passed |
| npm 11.19.0  | Worked. `npm ls` shows the kit `0.21.0` at `…seasonal-kit.git#f8ae818…`.                           | Worked | 5 passed |

CI on the merge commit `f8ae818`: `CI` and `CodeQL` passed. The backup script's behaviour on a real
PostgreSQL is proved by CI's `ops` job (and on the pull request), not by this proof, which shows only
that the installed file is whole and runs. The first run of the consumer's tests failed on its own
mistakes (it resolved `package.json`, which `exports` does not name, and matched a help text the
script does not print); the consumer was corrected, not the package. The two scratch folders were
left in the session's scratch directory, outside every repository: deleting them was refused by the
session's permission mode.

## The v0.22.0 phone layout fixes, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.22.0` (merge commit `2e8ed41`), both with `ignore-scripts=true`
(React and React DOM 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5), ran `tsc` and four tests on
the installed package:

- it is `0.22.0`;
- the installed `css/header.css` has the folded brand's `flex: 1 1 0; min-width: min-content` and
  `css/shell.css` the back link's `white-space: normal` on a phone;
- the installed `css/bar.css` has the bar's own padding (the gutter token, the smallest spacing on a
  phone, half of it at 400 px and under) and the wrapping facts;
- **a `StartCard` rendered from the installed package without `opensIn` has no countdown**, and with
  `opensIn={0}` shows "Opens in 0 s".

| Consumer     | Install                                                                                            | `tsc`  | Tests    |
| ------------ | -------------------------------------------------------------------------------------------------- | ------ | -------- |
| pnpm 12.14.0 | Worked. The lockfile resolved the tag to the merge commit's tarball (`codeload…/tar.gz/2e8ed41…`). | Worked | 4 passed |
| npm 11.19.0  | Worked. `npm ls` shows the kit `0.22.0` at `…seasonal-kit.git#2e8ed41…`.                           | Worked | 4 passed |

CI on the merge commit `2e8ed41`: `CI` passed. The layout itself is proved in the browser by
`showcase/cases.spec.ts` (60 tests, in the pull request's `showcase` job), not by this proof, which
shows that the files a game installs carry the change. The two scratch folders were left in the
session's scratch directory, outside every repository: deleting them was refused by the session's
permission mode.

## The v0.23.0 testing entry, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.23.0` (merge commit `6900866`), both with `ignore-scripts=true`
(React 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5, Vite 8.3.8, `@playwright/test` 1.64.1, the
oldest a game pins), ran `tsc` and three tests on the installed package:

- it is `0.23.0`, exports `./testing`, and names `@playwright/test` an optional peer;
- the guards find a fixed colour and a 10 px text in a game folder, and `findLowContrast` passes the
  installed `tokens.css`;
- **a game's bundle carries nothing of the testing entry**: a Vite build of an entry that imports the
  kit's value, React and CSS entries holds the start card and none of the testing code's strings.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.14.0 | Worked  | Worked | 3 passed |
| npm 11.19.0  | Worked  | Worked | 3 passed |

CI on the merge commit `6900866`: `CI` and `CodeQL` passed. The sweep's behaviour in a browser is
proved by `showcase/testing.spec.ts` in CI, not here. The scratch folders are left in the session's
scratch directory, outside every repository.

## The v0.24.0 client parts, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.24.0` (merge commit `84998cd`), both with `ignore-scripts=true`
(React and React DOM 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5), ran `tsc` and four tests on
the installed package:

- it is `0.24.0`, exports `./steps.css`, and its `header.css` brings it along;
- `StepBadges` draws the website's own icon, named by the step, and nothing for another address;
- `clockOffset` measures an offset and gives null without a sample; a `StartCard` with an
  unmeasured `opensAt` shows no countdown;
- `createApiClient` throws one `ApiError` with the status and the server's code.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.14.0 | Worked  | Worked | 4 passed |
| npm 11.19.0  | Worked  | Worked | 4 passed |

CI on the merge commit `84998cd`: `CI` and `CodeQL` passed. The scratch folders are left in the
session's scratch directory, outside every repository.

## The v0.25.0 operations scripts and load helpers, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.25.0` (merge commit `5927474`), both with `ignore-scripts=true`
(TypeScript 5.9.3 NodeNext, Vitest 5.0.5), ran `tsc` and four tests on the installed package:

- it is `0.25.0` and ships `ops/lib/backup-core.sh`, `backup-restore.sh` and `website-route.sh`;
- **`ops/backup.sh` finds its libraries from the installed package** (through pnpm's link too): it
  prints its help, and sourced it defines `do_restore` and `prune_backups`;
- the route library, sourced from the package, writes an nginx route with the game's sign-in
  location and upstream;
- `latencies`, `inBatches` and `watchServer` work from `@seasonal/kit/testing`.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.14.0 | Worked  | Worked | 4 passed |
| npm 11.19.0  | Worked  | Worked | 4 passed |

CI on the merge commit `5927474`: `CI` and `CodeQL` passed; the drill and the route file in the real
nginx and Caddy are in CI's `ops` job. The scratch folders are left in the session's scratch
directory, outside every repository.

## The v0.26.0 website stand-in and the database URL, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.26.0` (merge commit `0e94fef`), both with `ignore-scripts=true`
(TypeScript 5.9.3 NodeNext, Vitest 5.0.5), ran `tsc` and three tests on the installed package:

- it is `0.26.0`;
- **the stand-in website, from the package, signs a member in through its proxy**: the app gets the
  identity the kit's `identityFrom` reads and the game's secret, and the season feed passes
  `parseSeasonFeed`;
- the installed `ops/backup.sh` splits a database URL: the address without the password, the
  decoded password in `PGPASSWORD`.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.14.0 | Worked  | Worked | 3 passed |
| npm 11.19.0  | Worked  | Worked | 3 passed |

CI on the merge commit `0e94fef`: `CI` and `CodeQL` passed. The scratch folders are left in the
session's scratch directory, outside every repository.

## The v0.27.0 fix release, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.27.0` (merge commit `b51e7ba`), both with `ignore-scripts=true`
(React and React DOM 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5), ran `tsc` and five tests on
the installed package:

- it is `0.27.0`;
- `guardedFetch({ localOrigins })` reaches the named local origin and refuses another address;
- the named cross-origin write passes on its path only, the headers carry the new directives and the
  frame address with its path, and the plain-http cookie takes the base path;
- the installed docked screen has its named Tab stop, and `bar.css` reads `--sk-bar-gutter`;
- `print-units`, called through `node_modules/@seasonal/kit`, writes that path, not one in `.pnpm`.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.21.0 | Worked  | Worked | 5 passed |
| npm 11.19.0  | Worked  | Worked | 5 passed |

CI on the merge commit `b51e7ba`: `CI` and `CodeQL` passed. The scratch folders are left in the
session's scratch directory, outside every repository.

## The v0.28.0 season icons and operator address, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers pinned `#v0.28.0` (merge commit `c864703`), both with `ignore-scripts=true`
(React and React DOM 19.3.1, TypeScript 5.9.3 NodeNext, Vitest 5.0.5, Vite 8.3.8), ran `tsc` and
four tests on the installed package:

- it is `0.28.0`;
- the winter icon is the recorded bytes, and `SeasonIcon` names it "Winter";
- **a Vite build of `seasons.css` and one file imported by its package path carries all four
  icons**;
- `header.css` gives the brand link its 44 px box, and the installed `ops/lib/operator.sh` stops
  without a terminal, naming the file and the key.

| Consumer     | Install | `tsc`  | Tests    |
| ------------ | ------- | ------ | -------- |
| pnpm 12.14.0 | Worked  | Worked | 4 passed |
| npm 11.19.0  | Worked  | Worked | 4 passed |

CI on the merge commit `c864703`: `CI` and `CodeQL` passed. The scratch folders are left in the
session's scratch directory, outside every repository.

## The v0.29.0 to v0.32.0 ops releases, with pnpm and with npm (2026-11-26, the tags themselves)

For each tag two scratch consumers, one with pnpm 12.14.0 and one with npm 11.19.0, both with
`ignore-scripts=true`, installed `#<tag>` and ran that release's check on the installed files:

| Tag     | Merge     | What ran on the installed package                                                                    |
| ------- | --------- | ---------------------------------------------------------------------------------------------------- |
| v0.29.0 | `3b64ec7` | a game command on the shipped `ops/lib/admin.sh` prints the usage with `uninstall` and exits 2       |
| v0.30.0 | `f3829d2` | `sk_host_baseline website` from the shipped library says it changes nothing                          |
| v0.31.0 | `c5b24d5` | `findWeakContainers` from `@seasonal/kit/testing` names the three settings a bare service lacks      |
| v0.32.0 | `0016e86` | `grantAppRole` is exported; `sk_db_roles_apply` fills the shipped SQL with the names (sent to `cat`) |

All eight installs and checks passed. `CI` and `CodeQL` passed on each merge commit. The scratch
folders are left in the session's scratch directory, outside every repository.

## v0.33.0, with pnpm and with npm (2026-11-26, the tag itself)

Scratch consumers outside every repository, with `ignore-scripts=true`, installed `#v0.33.0`
(merge `4261eb9`):

- one with pnpm and one with npm typechecked and ran three tests on the installed files: the failure
  brake's `reserve` and live rule, the dense result and the header's controls group rendered, and
  the two new stylesheets and the restore shipped;
- one with pnpm and one with npm ran the shipped backup script's secret check: it refuses a
  differing secret, names the secrets without a folder and writes nothing.

All four passed, and `CI` and `CodeQL` passed on the merge commit. The scratch folders are left in
the session's scratch directory.

## v0.34.0, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.34.0` (merge `7c1e97f`), typechecked and ran three tests on
the installed files: the new stylesheets, the two shipped ops files, the primary "Sign in" and the
one-colour season icon; the client's `retry`, a local frame path and a token mix in the contrast
guard; the website stand-in's refusal of the proxy secret. Both passed. The scratch folders are
left in the session's scratch directory.

## v0.35.0, with pnpm and with npm (2026-11-26, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.35.0` (merge `8324170`), typechecked and ran three tests on
the installed files: `findPrivacyGaps` on a filled and an unfilled list, the stand-in's 64 px step
icon, and the shipped `ops/lib/image.sh` and route comments. Both passed. The scratch folders are
left in the session's scratch directory.

The release image workflow was proven on the throw-away tag `sk-test-image-1` (commit `431063f`),
before its `build-args` input was added; the scan workflow was proven again after that change.

## v0.36.0, with pnpm and with npm (2026-11-27, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.36.0` (merge `4f342ce`), typechecked (the exported `Attempt`
type included) and ran four tests on the installed files: `axeFinder`'s `exclude`, the stand-in with
`keepAliveMs`, and the shipped large-text styles, `.sk-dense-list` and ops files. Both passed. The
scratch folders are left in the session's scratch directory.

## v0.37.0, with pnpm and with npm (2026-11-27, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.37.0` (merge `f3d005a`), typechecked and ran three tests on
the installed files: the shared call's address and React exports, the stand-in's
`/embed/call/shared`, and the dock's `onSharedCall`. Both passed. The scratch folders are left in
the session's scratch directory.

## v0.38.0, with pnpm and with npm (2026-11-27, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.38.0` (merge `a21ffe4`), typechecked (the type
`VisibleFloor` included) and ran two tests on the installed files: a failing `setup` as a finding
and a floor no look checks, and the shipped `wholeItems`. Both passed. The scratch folders are
left in the session's scratch directory.

## v0.39.0, with pnpm and with npm (2026-11-27, the tag itself)

Two scratch consumers outside every repository, one with pnpm and one with npm, with
`ignore-scripts=true`, installed `#v0.39.0` (merge `cd25b4f`), typechecked (the types `Allowed` and
`IntendedOverlap` included) and ran two tests on the installed files: the new exports and the
refusal of an overlap without a decision number, and the shipped ops files, docked screen and dense
list's stylesheet. Both passed. The scratch folders are left in the session's scratch directory.

## The release image's commit check (2026-11-27)

The throw-away tag `sk-test-image-20261127` (commit `908afa5`) released the test image, signed
keyless, in run [46013416967](https://github.com/weudlll-cyber/seasonal-kit/actions/runs/46013416967).
With cosign 3.1.6 as `sk_cosign_install` installs it, `sk_image_verify` passed it with the
release's commit and refused it with another ("was not built from commit …"), with the default
signer and for another repository; the unsigned base image was refused; the SBOM's attestation
verified. The run deleted the test package; the tag was deleted on origin and locally.

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
