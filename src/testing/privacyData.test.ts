/**
 * @file   src/testing/privacyData.test.ts
 * @brief  `findPrivacyGaps` passes a filled privacy data list and names every gap (K107).
 *
 * Responsibility: a filled list passes, with columns in another order and a game's own column; an
 *                 empty cell, a placeholder, a missing column, a table without rows and a file
 *                 without a table are findings that name the line and the column; a table inside
 *                 a code fence is none; the kit's template fails as it is and passes once every
 *                 hint is replaced, so it cannot be copied in unfilled.
 * Depends on:     vitest, node:fs
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { findPrivacyGaps, PRIVACY_COLUMNS } from './privacyData.js';

const HEADER = `| ${PRIVACY_COLUMNS.join(' | ')} |`;
const RULE = `| ${PRIVACY_COLUMNS.map(() => '---').join(' | ')} |`;
const ROW =
  '| display name | shown in rounds | accounts | players | the account | DELETE /me | no |';
const list = (...rows: string[]): string => ['# Data', '', HEADER, RULE, ...rows, ''].join('\n');

describe('findPrivacyGaps', () => {
  it('passes a filled list, also with its columns turned and one of the game’s own', () => {
    expect(findPrivacyGaps(list(ROW, ROW))).toEqual([]);
    const turned = [...PRIVACY_COLUMNS].reverse().map((c) => c.toUpperCase());
    const text = [
      `| Table | ${turned.join(' | ')} |`,
      `|:--|${turned.map(() => '--:').join('|')}|`,
      '| x |  a \\| b | c | d | e | f | g | h |',
    ].join('\r\n');
    expect(findPrivacyGaps(text)).toEqual([]);
  });

  it.each(['', ' - ', '—', '?', 'TODO', 'tbd', '<who can see it>'])(
    'names the line and column of the cell %j',
    (cell) => {
      const row = `| name | why | where |${cell}| a year | on request | no |`;
      expect(findPrivacyGaps(list(ROW, row))).toEqual(['line 6: "Seen by" is empty']);
    },
  );

  it('names every empty cell, also of a row that stops early', () => {
    expect(findPrivacyGaps(list('| name | why | where | who |'))).toEqual(
      ['Kept for', 'Deleted by', 'Leaves the server'].map((c) => `line 5: "${c}" is empty`),
    );
  });

  it('wants every column in every table, and a row', () => {
    const short = '\n| Data | Purpose |\n| --- | --- |\n| a | b |\n';
    expect(findPrivacyGaps(`${list(ROW)}${short}`)).toEqual(
      PRIVACY_COLUMNS.slice(2).map((c) => `table at line 7: no column "${c}"`),
    );
    expect(findPrivacyGaps(list())).toEqual(['table at line 3: no row']);
  });

  it('finds no list in prose, or in a code fence', () => {
    const fenced = ['~~~md', HEADER, RULE, ROW, '~~~'].join('\n');
    for (const text of ['', '# Privacy\n\nWe store nothing.', fenced]) {
      expect(findPrivacyGaps(text)).toEqual(['no table of personal data']);
    }
  });

  it('fails the kit’s template as it is, and passes it once its hints are filled', () => {
    const template = readFileSync(
      new URL('../../docs/templates/PRIVACY-DATA.md', import.meta.url),
      'utf8',
    );
    expect(findPrivacyGaps(template).length).toBeGreaterThan(0);
    expect(findPrivacyGaps(template.replace(/<[^>|]*>/g, 'filled in'))).toEqual([]);
  });
});
