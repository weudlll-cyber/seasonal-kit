/**
 * @file   tests/workflows.test.ts
 * @brief  The GitHub workflows keep the rules the audits set: least privilege, a time limit on
 *         every job, every action pinned to a full commit SHA, and no untrusted input in a
 *         `run` line.
 *
 * Responsibility: reads the workflow files and the local actions' action.yml under .github as text:
 *                 - a top-level `permissions:` block, and no job asking for `write` beyond
 *                   `security-events` (CodeQL's results);
 *                 - `timeout-minutes` on every job, so a hung step cannot hold a runner for the
 *                   default six hours;
 *                 - every `uses:` is a local action or `owner/name@<40 hex>`;
 *                 - no `${{ … }}` expression of the event, a branch name, or a title inside a
 *                   `run:` block (an injection route); `concurrency` may use them.
 *                 The job and check names are not touched here (branch protection, K13).
 * Depends on:     vitest, node:fs
 * Source:         new in the kit (night audit 2026-11-25, piece 4e).
 */
import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const root = new URL('../.github/', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');
const workflows = readdirSync(new URL('workflows/', root)).filter((f) => f.endsWith('.yml'));
const actions = readdirSync(new URL('actions/', root)).map((d) => `actions/${d}/action.yml`);

// The text of each job under `jobs:`, by name.
function jobsOf(text: string): [string, string][] {
  const after = text.split(/^jobs:\s*$/m)[1] ?? '';
  const parts = after.split(/^ {2}([a-z][\w-]*):\s*$/m);
  const out: [string, string][] = [];
  for (let i = 1; i < parts.length; i += 2) out.push([parts[i] ?? '', parts[i + 1] ?? '']);
  return out;
}

describe.each(workflows)('workflow %s', (file) => {
  const text = read(`workflows/${file}`);

  it('has top-level permissions, and no write beyond the analysis results', () => {
    expect(text).toMatch(/^permissions:\s*\n\s+contents: read/m);
    const writes = [...text.matchAll(/^\s+([\w-]+): write/gm)].map((m) => m[1]);
    expect(writes.filter((w) => w !== 'security-events')).toEqual([]);
  });

  it('gives every job a time limit', () => {
    const jobs = jobsOf(text);
    expect(jobs.length).toBeGreaterThan(0);
    for (const [name, body] of jobs)
      expect(body, `job ${name}`).toMatch(/^\s+timeout-minutes: \d+/m);
  });
});

describe('every action', () => {
  it.each([...workflows.map((f) => `workflows/${f}`), ...actions])(
    '%s uses only local actions or full commit SHAs',
    (file) => {
      const uses = [...read(file).matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1] ?? '');
      for (const u of uses)
        expect(u.startsWith('./') || /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(u), u).toBe(true);
    },
  );

  it.each([...workflows.map((f) => `workflows/${f}`), ...actions])(
    '%s has no event or branch expression inside a run block',
    (file) => {
      const lines = read(file).split('\n');
      let inRun = false;
      let indent = 0;
      const bad: string[] = [];
      for (const line of lines) {
        const run = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(line);
        if (run) {
          inRun = true;
          indent = (run[1] ?? '').length;
          if (/\$\{\{/.test(run[2] ?? '')) bad.push(line.trim());
        } else if (inRun && line.trim() !== '' && line.length - line.trimStart().length <= indent) {
          inRun = false;
        } else if (inRun && /\$\{\{/.test(line)) bad.push(line.trim());
      }
      expect(bad).toEqual([]);
    },
  );
});
