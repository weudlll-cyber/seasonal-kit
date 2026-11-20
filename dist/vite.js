/**
 * @file   src/vite.ts
 * @brief  The kit's Vite plugin: serves ../browser/theme-init.js as `<base>theme-init.js`.
 *
 * Responsibility: Bingo's and Mini Games' index.html load `<script src="theme-init.js">` (an
 *                 external file before the first paint, as their strict CSP needs) from their own
 *                 copy in public/. With `themeInit()` in its Vite plugins a game drops that copy
 *                 and keeps the tag: in development the file is answered at the base path, in a
 *                 build it is written as `theme-init.js` beside index.html, unhashed, so the
 *                 relative src finds it under any base (`/games/<slug>/`).
 * Source:         new; replaces seasonal-mini-games and seasonal-bingo-royale
 *                 apps/web/public/theme-init.js (copies) with one file in the kit.
 * Depends on:     vite (types only, an optional peer: a game brings its own Vite), node:fs
 */
import { readFileSync } from 'node:fs';
const FILE = 'theme-init.js';
// The early script, read from the installed kit: browser/ sits beside dist/ (package "files").
const source = () => readFileSync(new URL(`../browser/${FILE}`, import.meta.url), 'utf8');
export function themeInit() {
    let path = `/${FILE}`;
    return {
        name: 'seasonal-kit:theme-init',
        configResolved(config) {
            path = `${config.base}${FILE}`;
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // The tag's relative src under the base, with or without a cache-busting query.
                if (req.url?.split('?')[0] !== path) {
                    next();
                    return;
                }
                res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
                res.end(source());
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: FILE, source: source() });
        },
    };
}
