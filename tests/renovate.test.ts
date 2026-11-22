/**
 * @file   tests/renovate.test.ts
 * @brief  Renovate sees every pinned version Renovate cannot find by itself: the scanner images
 *         in ci.yml's `env:`, and pnpm's hash in `packageManager`.
 *
 * Responsibility: the regex manager in renovate.json matches every `*_IMAGE:` line of
 *                 .github/workflows/ci.yml, each with its image, tag and sha256 digest, so a new
 *                 image cannot be added that Renovate does not update; `packageManager` names
 *                 pnpm's exact version with its sha512 hash (corepack's form), so the toolchain
 *                 is pinned to the bytes. Audit 2026-11-22 "Noted, not changed" (B6 info).
 * Source:         new in the kit (v0.10.1).
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

interface CustomManager {
  readonly customType: string;
  readonly managerFilePatterns: readonly string[];
  readonly matchStrings: readonly string[];
  readonly datasourceTemplate: string;
}

const config = JSON.parse(read('renovate.json')) as { customManagers: CustomManager[] };
const ci = read('.github/workflows/ci.yml');
const pkg = JSON.parse(read('package.json')) as { packageManager: string };

// Renovate's `/…/` file pattern as a JS RegExp.
const filePattern = (pattern: string): RegExp => new RegExp(pattern.slice(1, -1));

describe('Renovate and the scanner images', () => {
  const [images] = config.customManagers;

  it('has one regex manager for ci.yml, on the docker datasource', () => {
    expect(images?.customType).toBe('regex');
    expect(images?.datasourceTemplate).toBe('docker');
    const patterns = (images?.managerFilePatterns ?? []).map(filePattern);
    expect(patterns.some((p) => p.test('.github/workflows/ci.yml'))).toBe(true);
    expect(patterns.some((p) => p.test('.github/workflows/codeql.yml'))).toBe(false);
  });

  it('matches every *_IMAGE line of ci.yml with its image, tag and digest', () => {
    const lines = ci.split('\n').filter((l) => /^\s+[A-Z_]+_IMAGE:/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const match = new RegExp(images?.matchStrings[0] ?? 'missing');
    for (const line of lines) {
      const groups = match.exec(line)?.groups;
      expect(groups, line).toBeDefined();
      expect(groups?.['depName']).toMatch(/^[\w.-]+(\/[\w.-]+)+$/);
      expect(groups?.['currentValue']).toMatch(/^v?\d+\.\d+\.\d+$/);
      expect(groups?.['currentDigest']).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('refuses an image line without a digest', () => {
    const match = new RegExp(images?.matchStrings[0] ?? 'missing');
    expect(match.test('  X_IMAGE: ghcr.io/a/b:v1.0.0')).toBe(false);
  });
});

describe('the pinned package manager', () => {
  it('is pnpm at an exact version with its sha512 hash', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+\+sha512\.[a-f0-9]{128}$/);
  });
});
