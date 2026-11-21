/**
 * @file   src/devtools/index.ts
 * @brief  The `@seasonal/kit/devtools` entry: the shared recipe for a game's development
 *         sign-in and for keeping development code out of production (Node only).
 *
 * Responsibility: name what a game's dev route, build script and production-bundle test
 *                 import. Never imported by production code: the route's module is stubbed in
 *                 the production bundle, the build script and the test run at build time.
 * Source:         new in the kit.
 */
export { devSignInAccount } from './signIn.js';
export { devMarkersIn, devStubPlugin, KIT_DEV_MARKERS } from './bundle.js';
