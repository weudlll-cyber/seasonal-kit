/**
 * @file   src/testing/index.ts
 * @brief  The `@seasonal/kit/testing` entry: what a game's own Vitest and Playwright suites use.
 *
 * Responsibility: name the test tools: the sizes, the theme switch and the screenshots of a look,
 *                 and the static guards for colours, token contrast and text size. Test code only:
 *                 no other entry of the kit imports it, so it never reaches a game's bundle
 *                 (tests/package.test.ts), and it imports nothing at run time but Node's own
 *                 modules (Playwright is a type here, and an optional peer for that).
 * Source:         new in the kit (K66); see each module's header.
 */
export { findLowContrast } from './contrast.js';
export { findFixedColours, findSmallText } from './guards.js';
export { captureLook, DESKTOP, PHONE, setTheme, settle, SWEEP_SIZES, } from './screens.js';
