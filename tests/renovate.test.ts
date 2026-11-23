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
 *                 Since v0.11.1: Renovate never touches Node (engines `>=22` and .nvmrc `22`
 *                 agree, K38); the peers are caret ranges that the kit's own exact
 *                 devDependencies satisfy, widened on a major and never bumped otherwise (K37).
 * Source:         new in the kit (v0.10.1); the Node and peer rules since v0.11.1.
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

interface PackageRule {
  readonly matchDepNames?: readonly string[];
  readonly matchManagers?: readonly string[];
  readonly matchDepTypes?: readonly string[];
  readonly matchUpdateTypes?: readonly string[];
  readonly rangeStrategy?: string;
  readonly enabled?: boolean;
}

const config = JSON.parse(read('renovate.json')) as {
  customManagers: CustomManager[];
  packageRules: PackageRule[];
};
const ci = read('.github/workflows/ci.yml');
const pkg = JSON.parse(read('package.json')) as {
  packageManager: string;
  engines: { node: string };
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const peerRules = config.packageRules.filter((r) => r.matchDepTypes?.includes('peerDependencies'));

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

describe('Node, kept by hand (K38)', () => {
  it('is never updated by Renovate, in engines (npm) or in .nvmrc (nvm)', () => {
    const rule = config.packageRules.find((r) => r.matchDepNames?.includes('node'));
    expect(rule?.enabled).toBe(false);
    expect(rule?.matchManagers).toEqual(expect.arrayContaining(['npm', 'nvm']));
    expect(rule?.matchUpdateTypes).toBeUndefined();
  });

  it('says the same major in engines and .nvmrc', () => {
    expect(pkg.engines.node).toBe('>=22');
    expect(read('.nvmrc').trim()).toBe(pkg.engines.node.slice(2));
  });
});

describe('the peer ranges (K37)', () => {
  it('are caret ranges, each met by the exact devDependency the kit tests with', () => {
    expect(Object.keys(pkg.peerDependencies).sort()).toEqual(['react', 'vite']);
    for (const [name, range] of Object.entries(pkg.peerDependencies)) {
      const floor = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
      const own = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.devDependencies[name] ?? '');
      expect(floor, `${name} ${range}`).not.toBeNull();
      expect(own, `${name} devDependency`).not.toBeNull();
      // Same major, and minor.patch at or above the range's floor.
      const [lo = [], at = []] = [floor, own].map((m) => (m ?? []).slice(1).map(Number));
      expect(at[0]).toBe(lo[0]);
      const rank = (v: readonly number[]): number => (v[1] ?? 0) * 1e6 + (v[2] ?? 0);
      expect(rank(at)).toBeGreaterThanOrEqual(rank(lo));
    }
  });

  it('are widened on a major and never bumped on a minor, patch or pin', () => {
    expect(peerRules.find((r) => r.rangeStrategy !== undefined)?.rangeStrategy).toBe('widen');
    const off = peerRules.find((r) => r.enabled === false);
    expect(off?.matchUpdateTypes).toEqual(expect.arrayContaining(['minor', 'patch', 'pin']));
    expect(off?.matchUpdateTypes).not.toContain('major');
  });
});
