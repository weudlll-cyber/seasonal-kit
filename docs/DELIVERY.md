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
