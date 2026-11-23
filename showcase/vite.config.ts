/**
 * @file   showcase/vite.config.ts
 * @brief  Vite for the kit's showcase: two pages, the showcase and the stub of the website's
 *         chat embed, built into showcase/dist/ (git-ignored, never shipped).
 *
 * Responsibility: `pnpm showcase` serves it for people; the Playwright run builds it and
 *                 serves the build on a fixed port (../playwright.config.ts). The stub lives at
 *                 /embed/chat/, where `WebsiteChatFrame` frames the website's chat on a game's
 *                 own origin, so the showcase frames a page of its own and never a 404.
 *                 The two pages are the input map of `build.rolldownOptions` (since 2026-11-23;
 *                 before, the deprecated `rollupOptions`).
 * Source:         new in the kit.
 */
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here('.'),
  // Two pages, no single-page fallback: without it /embed/chat served the showcase itself,
  // which then framed itself again.
  appType: 'mpa',
  build: {
    outDir: here('dist'),
    emptyOutDir: true,
    // Vite 8 bundles with Rolldown; `rollupOptions` is its deprecated alias (#25, Vite 8.3.8).
    rolldownOptions: {
      input: { main: here('index.html'), chat: here('embed/chat/index.html') },
    },
  },
  preview: { port: 4317, strictPort: true },
});
