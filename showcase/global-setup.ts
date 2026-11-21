/**
 * @file   showcase/global-setup.ts
 * @brief  Before each Playwright run: the previous run's screens are deleted.
 *
 * Responsibility: screenshots are not committed and do not pile up (DECISIONS K16): each run
 *                 starts from an empty showcase/screens/ (git-ignored) and leaves only its own.
 */
import { mkdirSync, rmSync } from 'node:fs';

import { SCREENS } from './screens.js';

export default function globalSetup(): void {
  rmSync(SCREENS, { recursive: true, force: true });
  mkdirSync(SCREENS, { recursive: true });
}
