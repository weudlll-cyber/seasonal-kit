/**
 * @file   vitest.config.ts
 * @brief  Vitest for the kit: every *.test.ts under src/ and tests/, with coverage gates.
 *
 * Responsibility: one fast unit run that fails below 95 % of lines, branches and functions of
 *                 the kit's TypeScript (stricter than Mini Games, whose gates cover only its
 *                 pure packages: every game depends on all of this). Browser-facing tests opt
 *                 into jsdom with a `@vitest-environment jsdom` line of their own.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
