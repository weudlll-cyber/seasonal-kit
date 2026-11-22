/**
 * @file   src/devtools/bundle.ts
 * @brief  Keeping development code out of a game's production bundles, and proving it.
 *
 * Responsibility: `devStubPlugin` is an esbuild plugin for the game's server build. Every
 *                 relative or absolute import whose path, as written and joined to its folder
 *                 (not esbuild's resolved file), matches one of the game's development modules
 *                 (`devModule`: the Quick Test, the dev sign-in, a time-travel route) is
 *                 replaced by the game's stub file, whose exports throw when called. So the
 *                 pattern must match how the game writes those imports: with the `.js`
 *                 extension that NodeNext requires, as both games do. The app calls
 *                 them only with its dev switch, which a production install never sets. An import
 *                 through a package name, a `paths` alias or `#imports` is not seen: the games
 *                 import their dev modules relatively, and the bundle scan is the backstop that
 *                 fails if one slips through. `devModule` must have neither the g nor the y
 *                 flag (it would miss every other import).
 *                 `devMarkersIn` is the production-bundle test's scan: every shipped file below
 *                 a folder (source maps aside, which quote the sources) that holds one of the
 *                 markers, as "file: marker". The game's test builds its server and client into a
 *                 temporary folder and expects none. `KIT_DEV_MARKERS` are the strings of the
 *                 kit's own development UI (../react/dev) and of its dev sign-in check
 *                 (./signIn, `DEV_SIGN_IN_MARKER`), which neither scan may find. Typed without
 *                 esbuild (no dependency): the plugin is the object esbuild's `plugins` takes.
 * Source:         seasonal-bingo-royale apps/server/build.mjs (`devStub`), devStub.mjs and
 *                 apps/server/test/productionBundle.test.ts (`devMarkersIn`) at a43209a; the same
 *                 in seasonal-mini-games at 8de30b2.
 * Spec:           kit docs/ADOPTION.md "Dev tools"
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { DEV_SIGN_IN_MARKER } from './signIn.js';
// The strings the kit's DevSignIn and its test ids put into a client bundle, and the dev
// sign-in check's message into a server bundle.
export const KIT_DEV_MARKERS = [
    'Dev sign-in',
    'dev-sign-in-',
    DEV_SIGN_IN_MARKER,
];
// A relative or absolute path (POSIX, or a Windows drive); a package name is never a dev module.
const LOCAL_IMPORT = /^(?:\.|\/|[A-Za-z]:[\\/])/;
export function devStubPlugin({ devModule, stub }) {
    if (devModule.global || devModule.sticky) {
        throw new TypeError('devStubPlugin: the dev-module pattern has the g or y flag');
    }
    return {
        name: 'seasonal-dev-stub',
        setup(build) {
            build.onResolve({ filter: LOCAL_IMPORT }, (args) => devModule.test(path.resolve(args.resolveDir, args.path)) ? { path: stub } : undefined);
        },
    };
}
// "file: marker" for every shipped file below `dir` that holds a marker.
export function devMarkersIn(dir, markers) {
    const found = [];
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
        if (entry.name.endsWith('.map'))
            continue;
        const file = path.join(entry.parentPath, entry.name);
        // A symlinked file is scanned through its target, so a dev file linked into the output
        // cannot hide (audit 2026-11-22, B1 finding 6).
        const isFile = entry.isFile() || (entry.isSymbolicLink() && statSync(file).isFile());
        if (!isFile)
            continue;
        // latin1 reads any bytes; the markers are ASCII.
        const text = readFileSync(file, 'latin1');
        for (const marker of markers) {
            if (text.includes(marker))
                found.push(`${path.relative(dir, file)}: ${marker}`);
        }
    }
    return found;
}
