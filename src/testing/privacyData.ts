/**
 * @file   src/testing/privacyData.ts
 * @brief  A guard for a game's privacy data list: every table of its PRIVACY-DATA.md answers
 *         every question for every piece of personal data (K107).
 *
 * Responsibility: `findPrivacyGaps(markdown)` reads the file's tables (never inside a code fence)
 *                 and returns what is missing, as text a test shows: no table at all; a table
 *                 without one of the columns of `PRIVACY_COLUMNS` (in any order, in any case; a
 *                 game may add its own) or without a row; a cell of a required column left empty,
 *                 holding only a dash, "?", "TODO" or "TBD", or still the template's "<…>". An
 *                 empty list means the list is filled. It judges that a cell is answered, never
 *                 what the answer says, and cannot know which data a game stores: that stays the
 *                 game's review.
 * Depends on:     nothing
 * Source:         new in the kit; the columns after seasonal-bingo-royale docs/PRIVACY-DATA.md at
 *                 d7d841e (table, field, purpose, how long, deleted when), with who sees it and
 *                 whether it leaves the server added (owner, 2026-11-26).
 * Spec:           docs/templates/PRIVACY-DATA.md; docs/HANDBOOK.md "Before production"
 */
export const PRIVACY_COLUMNS = [
  'Data',
  'Purpose',
  'Stored in',
  'Seen by',
  'Kept for',
  'Deleted by',
  'Leaves the server',
] as const;

// An answer that is none: nothing, a dash, a question mark, a to-do or the template's own hint.
const UNANSWERED = /^(?:|[-–—]+|\?+|todo|tbd|<[^>]*>)$/i;

interface Table {
  // The file's line of the header, counted from 1.
  readonly line: number;
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

// A row's cells: split at every "|" that no backslash escapes, the outer ones dropped.
const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||(?<!\\)\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

const isRow = (line: string): boolean => line.trim().startsWith('|');
// The line under a header: cells of dashes, with or without alignment colons.
const isRule = (line: string): boolean =>
  isRow(line) && cells(line).every((c) => /^:?-+:?$/.test(c));

// The lines with every fenced code block blanked, so an example is no table.
function outsideFences(markdown: string): string[] {
  let fence: string | null = null;
  return markdown.split(/\r?\n/).map((line) => {
    const mark = /^\s*(```|~~~)/.exec(line)?.[1] ?? null;
    const inside = fence !== null || mark !== null;
    if (mark !== null) fence = fence === null ? mark : fence === mark ? null : fence;
    return inside ? '' : line;
  });
}

function tablesOf(markdown: string): Table[] {
  const lines = outsideFences(markdown);
  return lines.flatMap((line, i) => {
    if (!isRow(line) || !isRule(lines[i + 1] ?? '')) return [];
    const end = lines.findIndex((next, n) => n > i + 1 && !isRow(next));
    const rows = lines.slice(i + 2, end < 0 ? lines.length : end).map(cells);
    return [{ line: i + 1, header: cells(line), rows }];
  });
}

function gapsOf(table: Table): string[] {
  const where = `table at line ${String(table.line)}`;
  const names = table.header.map((name) => name.toLowerCase());
  const columns = PRIVACY_COLUMNS.map((name) => ({ name, at: names.indexOf(name.toLowerCase()) }));
  const missing = columns.filter((c) => c.at < 0);
  if (missing.length > 0) return missing.map((c) => `${where}: no column "${c.name}"`);
  if (table.rows.length === 0) return [`${where}: no row`];
  return table.rows.flatMap((row, n) =>
    columns
      .filter((c) => UNANSWERED.test(row[c.at] ?? ''))
      .map((c) => `line ${String(table.line + 2 + n)}: "${c.name}" is empty`),
  );
}

export function findPrivacyGaps(markdown: string): string[] {
  const tables = tablesOf(markdown);
  return tables.length === 0 ? ['no table of personal data'] : tables.flatMap(gapsOf);
}
