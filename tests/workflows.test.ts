/**
 * @file   tests/workflows.test.ts
 * @brief  The GitHub workflows keep the rules the audits set: least privilege, a time limit on
 *         every job, every action pinned to a full commit SHA, and no untrusted input in a
 *         `run` line.
 *
 * Responsibility: reads the workflow files and the local actions' action.yml under .github as text:
 *                 - a top-level `permissions:` block, and no job asking for `write` beyond
 *                   `security-events` (CodeQL's results), except the release image's two
 *                   workflows, which write packages and take the signing identity (K109);
 *                 - the release image is signed without a key, only on a tag (K109);
 *                 - `timeout-minutes` on every job that runs steps, so a hung step cannot hold a
 *                   runner for the default six hours;
 *                 - the reusable scan (./scan.yml) blocks nothing unless its caller says so
 *                   (K108);
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

// The release image's workflow and its proof push and sign, and delete the test image (K109).
const RELEASES = ['release-image.yml', 'release-image-test.yml'];
const RELEASE_WRITES = ['packages', 'id-token'];

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
    const allowed = ['security-events', ...(RELEASES.includes(file) ? RELEASE_WRITES : [])];
    expect(writes.filter((w) => !allowed.includes(w ?? ''))).toEqual([]);
  });

  it('gives every job a time limit', () => {
    const jobs = jobsOf(text);
    expect(jobs.length).toBeGreaterThan(0);
    // A job that calls a reusable workflow cannot name one: the called jobs carry theirs.
    for (const [name, body] of jobs.filter(([, b]) => !/^ {4}uses: /m.test(b)))
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

describe('the reusable scan (K108)', () => {
  const scan = read('workflows/scan.yml');

  it('is called by other projects, and by default only reports', () => {
    expect(scan).toMatch(/^on:\s*\n {2}workflow_call:/m);
    expect(scan).toMatch(/^ {6}blocking:\n(?: {8}.*\n)*? {8}default: false/m);
    expect(scan).toContain('if [ "$BLOCKING" = true ]; then exit 1; fi');
    // Only the verdict may fail the run: every scan notes its result instead.
    expect(scan.match(/\bexit 1\b/g)).toHaveLength(1);
  });
});

describe('the release image (K109)', () => {
  const release = read('workflows/release-image.yml');

  it('is built on a tag only, and signs the image and its SBOM without a key', () => {
    expect(release).toContain('if [ "$GITHUB_REF_TYPE" != tag ]');
    expect(release).toContain('cosign sign --yes "$IMAGE@$DIGEST"');
    expect(release).toContain('cosign attest --yes --type cyclonedx');
    // Keyless: no key file, no secret of its own.
    expect(release).not.toMatch(/--key\b|\bsecrets\.|COSIGN_(PASSWORD|PRIVATE)/);
    expect(release).toMatch(/^ {6}id-token: write/m);
  });

  it('is proven on a throw-away tag that removes its image whatever happens', () => {
    const proof = read('workflows/release-image-test.yml');
    expect(proof).toContain("tags: ['sk-test-image-*']");
    expect(proof).toMatch(/if: always\(\)[\s\S]*gh api -X DELETE "\$PACKAGE"/);
  });
});
