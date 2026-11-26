/**
 * @file   src/testing/guards.test.ts
 * @brief  The static guards find what breaks their rule, and nothing else (K66).
 *
 * Responsibility: on files written to a temporary folder (removed afterwards): a hex colour in a
 *                 component is found with its file and line, in all four lengths; one in a
 *                 comment, an anchor link, a test file or node_modules is not; a text size under
 *                 the floor is found as a fixed rem or px, a max()/clamp() minimum and a var()
 *                 fallback, in CSS and in JSX; a size computed from a box and one at the floor are
 *                 not; the floor and the endings can be named; and the token contrast guard
 *                 reports a short pair per theme, composites translucent layers, checks every
 *                 colour of a gradient and throws on a missing token.
 * Depends on:     vitest, node:fs, node:os, node:path
 * Source:         new in the kit (K66).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLowContrast } from './contrast.js';
import { findFixedColours, findSmallText } from './guards.js';

let dir = '';
const write = (name: string, text: string): string => {
  const file = path.join(dir, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
};

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'sk-guards-'));
  write(
    'ui/Bad.tsx',
    [
      '/* #123456 in a comment',
      '   #abcdef */',
      "const a = { color: '#fff' }; // #000 too",
      "const b = '#12345678';",
      "const c = <a href='#add'>x</a>;",
      "const d = '#a1b2c3' + '#abcd';",
    ].join('\n'),
  );
  write('ui/Good.test.tsx', "const x = '#fff';");
  write('ui/node_modules/dep/Dep.tsx', "const x = '#fff';");
  write('ui/notes.md', '#fff');
  write(
    'css/a.css',
    [
      '/* font-size: 2px */',
      '.a { font-size: 0.75rem; }',
      '.b { font-size: max(13px, 2vw); }',
      '.c { font-size: clamp(0.5rem, 3cqw, 3rem); }',
      '.d { font-size: var(--x, 12px); }',
      '.e { --font-size-small: 0.8rem; }',
      '.f { font-size: 0.875rem; }',
      '.g { font-size: 3cqmin; }',
      '.h { font-size: var(--y); }',
      '.i { font-size: max(var(--floor, 14px), 2vw); }',
    ].join('\n'),
  );
  write('css/B.tsx', "const s = { fontSize: '10px', other: 1 };");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// The paths below the temporary folder, in one order on every system.
const tail = (found: string[]): string[] =>
  found.map((f) => f.slice(dir.length + 1).replaceAll('\\', '/')).sort();

describe('findFixedColours', () => {
  it('finds every hex colour in a component with its line, and no comment or anchor', () => {
    expect(tail(findFixedColours([path.join(dir, 'ui')]))).toEqual([
      'ui/Bad.tsx:3 #fff',
      'ui/Bad.tsx:4 #12345678',
      'ui/Bad.tsx:6 #a1b2c3',
      'ui/Bad.tsx:6 #abcd',
    ]);
  });

  it('reads the endings it is given, and a single file', () => {
    const found = findFixedColours([path.join(dir, 'ui', 'notes.md')], { extensions: ['.md'] });
    expect(tail(found)).toEqual(['ui/notes.md:1 #fff']);
  });
});

describe('findSmallText', () => {
  it('finds a size whose smallest value is under 14 px', () => {
    expect(tail(findSmallText([path.join(dir, 'css')]))).toEqual([
      'css/B.tsx:1 fontSize: 10px',
      'css/a.css:2 font-size: 0.75rem',
      'css/a.css:3 font-size: max(13px, 2vw)',
      'css/a.css:4 font-size: clamp(0.5rem, 3cqw, 3rem)',
      'css/a.css:5 font-size: var(--x, 12px)',
      'css/a.css:6 --font-size-small: 0.8rem',
    ]);
  });

  it('takes the floor it is given', () => {
    const found = findSmallText([path.join(dir, 'css', 'a.css')], { floorPx: 12.5 });
    expect(tail(found)).toEqual([
      'css/a.css:2 font-size: 0.75rem',
      'css/a.css:4 font-size: clamp(0.5rem, 3cqw, 3rem)',
      'css/a.css:5 font-size: var(--x, 12px)',
    ]);
  });
});

const TOKENS = `:root {
  --bg: #ffffff;
  --card: rgb(0 0 0 / 50%);
  --ink: #000000;
  --faint: #bbbbbb;
  --bar: linear-gradient(#ffffff, #000000);
}
:root[data-theme='dark'] {
  --bg: #000000;
  --ink: #ffffff;
}`;

describe('findLowContrast', () => {
  const css = [TOKENS];

  it('passes pairs that keep the ratio in both themes', () => {
    expect(findLowContrast({ css, pairs: [{ text: '--ink', on: ['--bg'] }] })).toEqual([]);
  });

  it('reports a short pair in each theme, with the ratio', () => {
    const found = findLowContrast({ css, pairs: [{ text: '--faint', on: ['--bg'] }] });
    expect(found).toEqual(['light: --faint on --bg: 1.92 < 4.5']);
    const strict = findLowContrast({ css, pairs: [{ text: '--faint', on: ['--bg'], min: 12 }] });
    expect(strict.map((f) => f.slice(0, 4))).toEqual(['ligh', 'dark']);
  });

  it('lays a translucent layer over the layers below', () => {
    // Black text on a half black card over white is 5.3:1; over black it vanishes.
    const found = findLowContrast({ css, pairs: [{ text: '--ink', on: ['--bg', '--card'] }] });
    expect(found).toEqual([]);
    const dark = findLowContrast({
      css,
      pairs: [{ text: '--ink', on: ['--bg', '--card'], min: 6 }],
    });
    expect(dark).toEqual(['light: --ink on --bg + --card: 5.28 < 6']);
  });

  it('checks every colour of a gradient', () => {
    const found = findLowContrast({ css, pairs: [{ text: '--ink', on: ['--bar'] }] });
    expect(found).toHaveLength(2);
  });

  it('lets a later file win, and throws on a missing or colourless token', () => {
    const later = [...css, ':root {\n  --faint: #000000;\n}'];
    expect(findLowContrast({ css: later, pairs: [{ text: '--faint', on: ['--bg'] }] })).toEqual([
      'dark: --faint on --bg: 1.00 < 4.5',
    ]);
    expect(() => findLowContrast({ css, pairs: [{ text: '--gone', on: ['--bg'] }] })).toThrow(
      /--gone/,
    );
    expect(() => findLowContrast({ css: ['.x {}'], pairs: [{ text: '--a', on: [] }] })).toThrow();
  });
});

describe('findLowContrast over values written with tokens', () => {
  const css = [
    `:root {
  --white: #ffffff;
  --black: #000000;
  --paper: var(--white);
  --ink: var(--missing, var(--black));
  --grey: color-mix(in srgb, var(--black) 50%, var(--paper));
  --wash: color-mix(in srgb, var(--black) 50%, transparent);
  --nested: color-mix(in srgb, color-mix(in srgb, var(--black), var(--white)) 100%, var(--white));
  --lost: var(--gone);
  --loop: var(--loop);
  --lab: color-mix(in oklab, var(--black), var(--white));
  --named: color-mix(in srgb, red, var(--white));
}`,
  ];
  const against = (text: string, on: readonly string[], min?: number): string[] =>
    findLowContrast({ css, pairs: [{ text, on, ...(min === undefined ? {} : { min }) }] });

  it('follows var(), with its fallback', () => {
    expect(against('--ink', ['--paper'], 20)).toEqual([]);
  });

  it('mixes in srgb as a browser does, nested and with transparency', () => {
    // Half black on white is #808080: 3.98 on white.
    expect(against('--grey', ['--paper'])).toEqual(
      ['light', 'dark'].map((t) => `${t}: --grey on --paper: 3.98 < 4.5`),
    );
    expect(against('--nested', ['--paper'])[0]).toMatch(/3\.98 < 4\.5/);
    // The same half black, translucent, over white.
    expect(against('--wash', ['--paper'])[0]).toMatch(/3\.98 < 4\.5/);
  });

  it('checks a pair written as values, one share giving the other its rest', () => {
    const text = 'color-mix(in srgb, var(--white), var(--black) 100%)';
    expect(against(text, ['var(--paper)'], 20)).toEqual([]);
  });

  it.each(['--lost', '--loop', '--lab', '--named', 'var(--gone)'])(
    'reports %s as unresolved, in each theme, and never passes it',
    (value) => {
      expect(against(value, ['--paper'], 1)).toEqual(
        ['light', 'dark'].map((t) => `${t}: ${value} on --paper: unresolved ${value}`),
      );
      expect(against('--ink', [value], 1)[0]).toContain(`unresolved ${value}`);
    },
  );
});
