/**
 * @file   tests/tokens.test.ts
 * @brief  css/tokens.css parses into the shared set, every reference resolves, nothing
 *         game-specific is in it.
 *
 * Responsibility: the 49 tokens Bingo Royale and Mini Games share (their 51 common names but the
 *                 ball's two, which only Bingo uses) in the light theme; the dark theme only
 *                 replaces names the light one defines; every `var(--x)` names a token defined
 *                 here; no arena token, player mark or own tint of a single game moved in.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readTokens } from '../scripts/css-tokens.mjs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const tokens = readTokens(css);

describe('css/tokens.css', () => {
  it('parses into the 49 shared tokens, with values', () => {
    expect(tokens.light.size).toBe(49);
    for (const value of tokens.light.values()) expect(value).not.toBe('');
  });

  it('lets the dark theme replace only tokens the light theme defines', () => {
    expect(tokens.dark.size).toBeGreaterThan(0);
    for (const name of tokens.dark.keys()) expect(tokens.light.has(name)).toBe(true);
  });

  it('defines every token it refers to', () => {
    const refs = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(tokens.light.has(ref ?? '')).toBe(true);
  });

  it("holds no single game's own tokens", () => {
    const own =
      /^--(color-(board|bingo-card|ball|own|winter-text|success-text)|mark-|own-|font-size-ball)/;
    expect([...tokens.light.keys()].filter((n) => own.test(n))).toEqual([]);
  });
});

describe('readTokens', () => {
  it('reads the dark block in either quote style, ignores comments and joins multi-line values', () => {
    const t = readTokens(
      `/* --x: 1; */ :root { --a: linear-gradient(\n  90deg,\n  red\n); }\n:root[data-theme="dark"] { --a: blue; }`,
    );
    expect(t.light.get('--a')).toBe('linear-gradient( 90deg, red )');
    expect(t.light.has('--x')).toBe(false);
    expect(t.dark.get('--a')).toBe('blue');
  });
});
