/**
 * @file   src/testing/guards.ts
 * @brief  Static guards a game runs in its own Vitest suite: no fixed colour in a component, no
 *         text size below the floor.
 *
 * Responsibility: both read source files (folders are walked; test files and node_modules are
 *                 left out) with comments removed, and return what breaks the rule as
 *                 "file:line what", so a game's test is `expect(…).toEqual([])`:
 *                 - `findFixedColours`: a hex colour (#rgb to #rrggbbaa) in a component
 *                   (.tsx by default). Colours come from tokens, or the light or dark theme
 *                   breaks;
 *                 - `findSmallText`: a `font-size`, `fontSize` or `--font-size-…` whose smallest
 *                   possible value is under the floor (14 px at a 16 px root): a fixed rem or px,
 *                   the first argument of max() or clamp(), or a var() fallback. A size computed
 *                   from a box is not judged (the browser sweep does that).
 * Depends on:     node:fs, node:path
 * Source:         seasonal-bingo-royale apps/web/src/noFixedColours.test.ts and
 *                 minTextSize.test.ts at 8d20904 (noFixedColours is the same file in Mini Games
 *                 at 9e3c6f3). Generalised: the folders, extensions and floor are parameters.
 *                 Left in the games: their card-number floor and their podium rules.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export interface GuardOptions {
  // File endings to read. Default: `.tsx` for colours; `.css` and `.tsx` for text sizes.
  readonly extensions?: readonly string[];
}

// Every file under the paths with one of the endings, test files and dependencies left out.
function sourceFiles(paths: readonly string[], extensions: readonly string[]): string[] {
  return paths.flatMap((p) => {
    if (!statSync(p).isDirectory()) return [p];
    return readdirSync(p, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'node_modules' ? [] : sourceFiles([full], extensions);
      }
      const wanted = extensions.some((e) => entry.name.endsWith(e));
      return wanted && !entry.name.includes('.test.') ? [full] : [];
    });
  });
}

// Comments blanked, line breaks kept, so a reported line number is the file's own.
const withoutComments = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

function matches(
  files: readonly string[],
  pattern: RegExp,
  judge: (match: RegExpExecArray) => string | null,
): string[] {
  return files.flatMap((file) => {
    const text = withoutComments(readFileSync(file, 'utf8'));
    return [...text.matchAll(pattern)].flatMap((match) => {
      const found = judge(match);
      if (found === null) return [];
      const line = text.slice(0, match.index).split('\n').length;
      return [`${file}:${String(line)} ${found}`];
    });
  });
}

export function findFixedColours(paths: readonly string[], options: GuardOptions = {}): string[] {
  const files = sourceFiles(paths, options.extensions ?? ['.tsx']);
  // 3, 4, 6 or 8 hex digits; not part of a longer word, and not an `href="#add"` anchor.
  const hex = /(?<![\w&])(?<!href=["'])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
  return matches(files, hex, (m) => m[0]);
}

// The arguments of a call at the top level of `value`, commas inside brackets kept.
function argsOf(value: string): string[] {
  const inner = value.slice(value.indexOf('(') + 1, value.lastIndexOf(')'));
  const out: string[] = [''];
  let depth = 0;
  for (const ch of inner) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push('');
    else out.push(`${out.pop() ?? ''}${ch}`);
  }
  return out.map((a) => a.trim());
}

// The smallest size a value can take, in px at a 16 px root; null when it depends on a box.
function smallestPx(value: string): number | null {
  const v = value.trim();
  const fixed = /^([\d.]+)(rem|px)$/.exec(v);
  if (fixed !== null) return Number(fixed[1]) * (fixed[2] === 'rem' ? 16 : 1);
  if (/^(max|clamp)\(/.test(v)) return smallestPx(argsOf(v)[0] ?? '');
  const fallback = v.startsWith('var(') ? argsOf(v)[1] : undefined;
  return fallback === undefined ? null : smallestPx(fallback);
}

export function findSmallText(
  paths: readonly string[],
  options: GuardOptions & { readonly floorPx?: number } = {},
): string[] {
  const floor = options.floorPx ?? 14;
  const files = sourceFiles(paths, options.extensions ?? ['.css', '.tsx']);
  // The value runs to the end of its declaration; a quoted one (JSX) to its closing quote.
  const sizes = /(font-size|fontSize|--font-size-[\w-]+):\s*('[^']*'|[^;\n}]+)/g;
  return matches(files, sizes, (m) => {
    const value = (m[2] ?? '').replace(/^'|'$/g, '').trim();
    const px = smallestPx(value);
    return px !== null && px < floor ? `${m[1] ?? ''}: ${value}` : null;
  });
}
