/**
 * @file   tests/ops.test.ts
 * @brief  The shipped backup scripts are in the package, have their headers, and every setting
 *         they read is documented (v0.21.0, K61).
 *
 * Responsibility: `package.json` `files` names the three scripts of ops/ and not the tests; each
 *                 starts with its header; ops/backup.sh sets `-euo pipefail` and never traces
 *                 (`set -x` would print a secret); and the `SK_BACKUP_*` variables the script
 *                 reads are exactly the ones docs/OPERATIONS.md lists, so the documentation
 *                 cannot drift from the script. The behaviour is proved on real containers by
 *                 ops/test/backup.test.sh (CI job `ops`).
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json')) as { files: string[] };
const script = read('ops/backup.sh');
const docs = read('docs/OPERATIONS.md');

describe('the shipped ops scripts', () => {
  it('are listed in the package, the tests are not', () => {
    for (const f of ['ops/backup.sh', 'ops/pull-backups.sh', 'ops/pull-backups.ps1']) {
      expect(pkg.files, f).toContain(f);
    }
    expect(pkg.files.some((f) => f.includes('test'))).toBe(false);
  });

  it.each(['ops/backup.sh', 'ops/pull-backups.sh', 'ops/pull-backups.ps1'])(
    '%s starts with its header',
    (path) => {
      expect(read(path).slice(0, 400)).toMatch(new RegExp(`@file\\s+${path.replace('.', '\\.')}`));
    },
  );

  it('backup.sh stops on errors and never traces', () => {
    expect(script).toMatch(/^set -euo pipefail$/m);
    expect(script).not.toMatch(/set -[a-z]*x/);
  });
});

describe('the settings', () => {
  const inScript = new Set(script.match(/SK_BACKUP_[A-Z_]+/g));
  const inDocs = new Set([...docs.matchAll(/^\| `(SK_BACKUP_[A-Z_]+)`/gm)].map((m) => m[1]));

  it('are exactly the ones docs/OPERATIONS.md lists', () => {
    expect([...inDocs].sort()).toEqual([...inScript].sort());
  });

  it('are at least the ones a game needs to name', () => {
    for (const name of [
      'PREFIX',
      'DIR',
      'AGE_RECIPIENT',
      'DB_CONTAINER',
      'VOLUMES',
      'SECRET_FILES',
    ]) {
      expect(inDocs.has(`SK_BACKUP_${name}`), name).toBe(true);
    }
  });
});
