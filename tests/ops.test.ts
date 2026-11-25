/**
 * @file   tests/ops.test.ts
 * @brief  The shipped backup scripts are in the package, have their headers, and every setting
 *         they read is documented (v0.21.0, K61).
 *
 * Responsibility: `package.json` `files` names the scripts of ops/, the libraries included, and not
 *                 the tests; each starts with its header and keeps the 300-line rule; ops/backup.sh
 *                 sets `-euo pipefail`, sources both libraries, and no part of it ever traces
 *                 (`set -x` would print a secret); and the `SK_BACKUP_*` variables the scripts
 *                 read are exactly the ones docs/OPERATIONS.md lists, so the documentation
 *                 cannot drift from the script. The behaviour is proved on real containers by
 *                 ops/test/backup.test.sh (CI job `ops`).
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json')) as { files: string[] };
const BACKUP = ['ops/backup.sh', 'ops/lib/backup-core.sh', 'ops/lib/backup-restore.sh'];
const SHIPPED = [...BACKUP, 'ops/pull-backups.sh', 'ops/pull-backups.ps1'];
// The entry and its libraries are one script to the shell, so they are read as one.
const script = BACKUP.map(read).join('\n');
const docs = read('docs/OPERATIONS.md');

describe('the shipped ops scripts', () => {
  it('are listed in the package, the tests are not', () => {
    for (const f of SHIPPED) {
      expect(pkg.files, f).toContain(f);
    }
    expect(pkg.files.some((f) => f.includes('test'))).toBe(false);
  });

  it.each(SHIPPED)('%s starts with its header and keeps the 300-line rule', (path) => {
    expect(read(path).slice(0, 400)).toMatch(new RegExp(`@file\\s+${path.replace('.', '\\.')}`));
    expect(read(path).trimEnd().split('\n').length).toBeLessThanOrEqual(300);
  });

  it('the entry sources every library it ships', () => {
    for (const lib of BACKUP.slice(1)) {
      expect(read('ops/backup.sh')).toContain(
        `source "\${SK_SELF%/*}/${lib.slice('ops/'.length)}"`,
      );
    }
  });

  it('backup.sh stops on errors and never traces', () => {
    expect(read('ops/backup.sh')).toMatch(/^set -euo pipefail$/m);
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
