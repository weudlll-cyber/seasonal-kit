/**
 * @file   src/testing/index.ts
 * @brief  The `@seasonal/kit/testing` entry: what a game's own Vitest and Playwright suites use.
 *
 * Responsibility: name the test tools: the sizes, the theme switch, the screenshots of a look,
 *                 the probe and the sweep, the load check's measuring helpers, the website's
 *                 stand-in, the container hardening check, the privacy data list's check, and the
 *                 static guards for colours, token contrast and text size. Test code only:
 *                 no other entry of the kit imports it, so it never reaches a game's bundle
 *                 (tests/package.test.ts), and it imports nothing at run time but Node's own
 *                 modules (Playwright is a type here, and an optional peer for that).
 * Source:         new in the kit (K66); see each module's header.
 */
export { findWeakContainers, type ContainerRole, type HardeningOptions } from './containers.js';
export { findLowContrast, type ContrastInput, type ContrastPair } from './contrast.js';
export {
  inBatches,
  latencies,
  watchServer,
  type Latencies,
  type ServerLoad,
  type WatchOptions,
} from './load.js';
export { findFixedColours, findSmallText, type GuardOptions } from './guards.js';
export {
  captureLook,
  DESKTOP,
  PHONE,
  setTheme,
  settle,
  SWEEP_SIZES,
  type Size,
  type Theme,
} from './screens.js';
export { findPrivacyGaps } from './privacyData.js';
export { probe, type IntendedOverlap, type Probe } from './probe.js';
export type { OpenRoundsRead, StandInMember } from './standInContract.js';
export type { StandInGame } from './standInProxy.js';
export { startWebsiteStandIn, type StandInOptions, type WebsiteStandIn } from './websiteStandIn.js';
export {
  axeFinder,
  sweep,
  type Allowed,
  type AxeFinder,
  type SweepOptions,
  type SweepScreen,
} from './sweep.js';
export type { VisibleFloor } from './sweepFloors.js';
