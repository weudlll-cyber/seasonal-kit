# Delivery

How a game gets the kit, and what was proven on 2026-11-20 before anything else was built.

## How a game pins the kit

```json
"dependencies": {
  "@seasonal/kit": "github:weudlll-cyber/seasonal-kit#v0.1.0"
}
```

- The tag is the version. A game moves only when its own `package.json` names a new tag, with
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

## What this means for the kit

- `dist/` is committed and must equal a fresh `pnpm build`; CI fails otherwise
  (`.github/workflows/ci.yml`, job `verify`).
- `package.json` `"files"` decides what a game receives: `browser/`, `css/` and `dist/` since
  v0.1.0, and `fonts/` since v0.2.0. A new folder that a game needs goes in there.
  Two pairs of folders must ship together: `css/fonts.css` points at `../fonts/`, and
  `dist/vite.js` reads `../browser/theme-init.js` from the installed package.
- `exports` names every entry. Types come first, so TypeScript finds the `.d.ts`.
- A game's lockfile pins the commit, not just the tag. A tag moved after the fact would not reach
  a game unnoticed: the integrity hash would no longer match. Tags are never moved
  (docs/RELEASING.md).
