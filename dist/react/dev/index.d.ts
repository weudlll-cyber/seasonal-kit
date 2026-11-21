/**
 * @file   src/react/dev/index.ts
 * @brief  The `@seasonal/kit/react/dev` entry: development-only UI, loaded lazily by a game
 *         behind its dev flag, so a production bundle never holds it.
 * Source:         new in the kit.
 */
export { DevSignIn, type DevIdentity, type DevSignInProps } from './DevSignIn.js';
