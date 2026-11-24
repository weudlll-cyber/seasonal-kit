/**
 * @file   tests/fonts.test.ts
 * @brief  css/fonts.css points only at shipped files, uses every shipped file, and names the
 *         family tokens.css uses; each font file keeps the hash its licence note records.
 *
 * Responsibility: a game that imports `@seasonal/kit/fonts.css` gets every face it declares:
 *                 each `url()` resolves to a file inside a folder package.json ships ("files"),
 *                 no woff2 sits unused in fonts/, the @font-face family is the first family of
 *                 `--sk-font-family`, and the files are the ones the owner approved (fonts/README.md).
 * Source:         new in the kit.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readTokens } from '../scripts/css-tokens.mjs';

const root = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');
const fontsCss = read('css/fonts.css');
const faces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1] ?? '');
const shipped = (JSON.parse(read('package.json')) as { files: string[] }).files;

// The path of each url() in css/fonts.css, relative to the repository root.
const sources = faces.flatMap((f) =>
  [...f.matchAll(/url\('([^']+)'\)/g)].map((m) => new URL(m[1] ?? '', new URL('css/', root))),
);
const relative = (u: URL): string => u.href.slice(root.href.length);

describe('css/fonts.css', () => {
  it('declares the five faces', () => {
    expect(faces).toHaveLength(5);
    expect(sources).toHaveLength(5);
  });

  it('points every src at an existing file in a shipped folder', () => {
    for (const src of sources) {
      expect(existsSync(src)).toBe(true);
      expect(shipped).toContain(relative(src).split('/')[0]);
    }
    expect(shipped).toContain('css');
  });

  it('uses every font file in fonts/', () => {
    const files = readdirSync(new URL('fonts/', root)).filter((f) => f.endsWith('.woff2'));
    expect(sources.map(relative).sort()).toEqual(files.map((f) => `fonts/${f}`).sort());
  });

  it('names the family that --sk-font-family puts first', () => {
    const token = readTokens(read('css/tokens.css')).light.get('--sk-font-family') ?? '';
    const first = token.split(',')[0]?.trim();
    const families = new Set(faces.map((f) => /font-family:\s*([^;]+);/.exec(f)?.[1]?.trim()));
    expect([...families]).toEqual([first]);
  });
});

describe('the font files', () => {
  // The table in fonts/README.md: file name → sha256.
  const recorded = new Map(
    [
      ...read('fonts/README.md').matchAll(/`(luxora-grotesk-[a-z-]+\.woff2)`.*?`([0-9a-f]{64})`/g),
    ].map((m) => [m[1] ?? '', m[2] ?? '']),
  );

  it('are the approved bytes, as fonts/README.md records them', () => {
    expect(recorded.size).toBe(5);
    for (const [file, sha] of recorded) {
      const bytes = readFileSync(new URL(`fonts/${file}`, root));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
    }
  });
});
