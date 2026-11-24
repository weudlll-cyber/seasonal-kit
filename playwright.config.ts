/**
 * @file   playwright.config.ts
 * @brief  Playwright for the kit's showcase: Chromium, the built showcase served by Vite's
 *         preview, the screens of the last run only.
 *
 * Responsibility: `pnpm showcase:test` builds the showcase, serves it on port 4317, and runs
 *                 showcase/showcase.spec.ts (a screenshot of every viewport and theme into
 *                 showcase/screens/ and axe on each) and showcase/layout.spec.ts (what only a
 *                 browser's layout shows, measured) and showcase/sheet.spec.ts (the phone chat
 *                 sheet inside the visible height, v0.17.0) and showcase/steps.spec.ts (the
 *                 header's step badges, v0.19.0). ./showcase/global-setup.ts deletes the
 *                 previous run's screens first, so they never pile up (DECISIONS K16); the
 *                 folder is git-ignored and never committed. CI runs it on every PR (job
 *                 `showcase`) and keeps no screens.
 * Source:         seasonal-mini-games e2e/playwright.config.ts and .github/workflows/ci.yml (job
 *                 e2e) at 866df03, cut to one static page in Chromium.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './showcase',
  testMatch: '*.spec.ts',
  globalSetup: './showcase/global-setup.ts',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4317' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm showcase:build && pnpm exec vite preview --config showcase/vite.config.ts',
    url: 'http://localhost:4317',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
