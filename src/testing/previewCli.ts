#!/usr/bin/env node
/**
 * @file   src/testing/previewCli.ts
 * @brief  The command `sk-preview`: a game's local website-mode preview (K124).
 *
 * Responsibility: hands the process's arguments and environment to ./preview `runPreview`, prints
 *                 its lines, and stops the preview on Ctrl+C or a termination signal, after which
 *                 the process ends by itself.
 * Depends on:     ./preview
 * Source:         new in the kit.
 */
import { runPreview } from './preview.js';

process.exitCode = await runPreview(
  process.argv.slice(2),
  process.env,
  (line) => {
    process.stdout.write(`${line}\n`);
  },
  (stop) => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void stop();
      });
    }
  },
);
