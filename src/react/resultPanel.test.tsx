// @vitest-environment jsdom
/**
 * @file   src/react/resultPanel.test.tsx
 * @brief  The result frame as a panel inside a screen (Bingo R4, v0.11.0).
 *
 * Responsibility: with `panel`, the headline is a heading of the level the game gives (never
 *                 the page's h1), the frame says `data-sk-variant="panel"`, and frames.css gives
 *                 the panel no one-screen first part and breaks names only at their own break
 *                 points (`overflow-wrap: normal`), where a page keeps `anywhere`. Without it the
 *                 frame is the page it was.
 * Depends on:     vitest, jsdom, @testing-library/react, node:fs
 * Source:         seasonal-bingo-royale apps/web/src/minTextSize.test.ts at 5c613c0 (its podium
 *                 rule: no `overflow-wrap: anywhere`)
 */
import { readFileSync } from 'node:fs';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResultFrame, type ResultFrameProps } from './ResultFrame.js';

afterEach(() => {
  cleanup();
});

const props: ResultFrameProps = {
  game: 'bingo',
  headline: 'Final placement',
  reveal: <p>podium</p>,
  placings: <ol />,
  signature: 'final',
};

// By path from the repository's root: under jsdom `URL` is jsdom's, which node:fs refuses.
const css = readFileSync('css/frames.css', 'utf8');

// The declarations of the rule whose selector is exactly `selector`.
function rule(selector: string): string {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? '' : css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
}

describe('the result as a panel', () => {
  it('heads the panel at the game’s level and names its variant', () => {
    // Plain queries: role queries are slow in jsdom, and the heading is plain markup.
    const { container } = render(<ResultFrame {...props} panel={{ level: 3 }} />);
    expect(container.querySelector('h3')?.textContent).toBe('Final placement');
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getByTestId('result').dataset['skVariant']).toBe('panel');
  });

  it('stays the page it was without it: an h1, the page variant', () => {
    const { container } = render(<ResultFrame {...props} />);
    expect(container.querySelector('h1')?.textContent).toBe('Final placement');
    expect(screen.getByTestId('result').dataset['skVariant']).toBe('page');
  });

  it('gives the panel no one-screen first part and never breaks a name inside', () => {
    expect(rule(".sk-result[data-sk-variant='panel']")).toContain('overflow-wrap: normal');
    expect(rule(".sk-result[data-sk-variant='panel'] .sk-result-first")).toContain('height: auto');
    // The page keeps breaking anywhere rather than run wide.
    expect(rule('.sk-result')).toContain('overflow-wrap: anywhere');
  });
});
