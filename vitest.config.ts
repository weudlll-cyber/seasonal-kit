/**
 * @file   vitest.config.ts
 * @brief  Vitest for the kit: every *.test.ts under src/ and tests/, in Node by default.
 *
 * Responsibility: one fast unit run; browser-facing tests opt into jsdom with a
 *                 `@vitest-environment jsdom` line of their own.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
