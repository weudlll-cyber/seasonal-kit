// @vitest-environment jsdom
/**
 * @file   src/react/resultShape.test.tsx
 * @brief  The result frame without a reveal, and with a middle card (v0.15.0, BACKLOG 12 and 17).
 *
 * Responsibility: a game that passes a reveal and no middle gets today's frame: the reveal box,
 *                 no `data-sk-reveal`, no middle. A null or missing reveal renders no reveal box
 *                 and sets `data-sk-reveal="none"`, which css/frames.css lays out in one column
 *                 (tests/result-shape-css.test.ts). A middle card sits between the first part
 *                 and `more`, in that order, and is fixed in the fitting like the first part
 *                 (`data-sk-fit-fixed`); without it there is none.
 * Source:         docs/concepts/result-frame.md (points 1 and 2); Mini Games' "Closest to
 *                 winning" (apps/web/src/round/ClosestToWinning.tsx at 721761f).
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResultFrame } from './ResultFrame.js';

afterEach(cleanup);

describe('the reveal', () => {
  it('is rendered, and the frame as today, when the game passes one', () => {
    render(
      <ResultFrame game="mini-games" headline="H" reveal={<p>42</p>} placings="–" signature="a" />,
    );
    const result = screen.getByTestId('result');
    expect(result.querySelector('.sk-result-reveal')?.textContent).toBe('42');
    expect(result.hasAttribute('data-sk-reveal')).toBe(false);
    expect(result.querySelector('.sk-result-middle')).toBeNull();
  });

  it.each([
    ['null', null],
    ['missing', undefined],
  ])('renders no reveal box when it is %s, and says so', (_what, reveal) => {
    render(
      <ResultFrame game="bingo" headline="H" reveal={reveal} placings="podium" signature="a" />,
    );
    const result = screen.getByTestId('result');
    expect(result.querySelector('.sk-result-reveal')).toBeNull();
    expect(result.getAttribute('data-sk-reveal')).toBe('none');
    // The placings are still there, in the first part.
    expect(screen.getByTestId('result-first').querySelector('.sk-result-places')?.textContent).toBe(
      'podium',
    );
  });

  it('renders a reveal that is falsy but given (0 is a reveal)', () => {
    render(<ResultFrame game="mini-games" headline="H" reveal={0} placings="–" signature="a" />);
    expect(screen.getByTestId('result').querySelector('.sk-result-reveal')?.textContent).toBe('0');
  });

  it('the frame fits without a reveal when asked', () => {
    render(<ResultFrame game="bingo" headline="H" placings="p" fitted signature="a" />);
    expect(screen.getByTestId('result').dataset['skFitScale']).toBe('1');
  });
});

describe('the middle card', () => {
  it('sits between the first part and more, fixed in the fitting', () => {
    render(
      <ResultFrame
        game="mini-games"
        headline="H"
        reveal="r"
        placings="p"
        middle={<p>Closest to winning</p>}
        more={<p>Standings</p>}
        signature="a"
      />,
    );
    const kids = [...screen.getByTestId('result').children].map((c) => c.className);
    expect(kids).toEqual(['sk-result-first', 'sk-result-middle', 'sk-result-more']);
    const middle = screen.getByTestId('result-middle');
    expect(middle.textContent).toBe('Closest to winning');
    expect(middle.hasAttribute('data-sk-fit-fixed')).toBe(true);
  });

  it('is absent without one, and the frame has no more either', () => {
    render(<ResultFrame game="mini-games" headline="H" reveal="r" placings="p" signature="a" />);
    expect(screen.queryByTestId('result-middle')).toBeNull();
    expect([...screen.getByTestId('result').children].map((c) => c.className)).toEqual([
      'sk-result-first',
    ]);
  });
});
