// @vitest-environment jsdom
/**
 * @file   src/react/frames.test.tsx
 * @brief  The start card and the result frame: their slots in place, the season, the countdown,
 *         the fit, and both keeping the docked chat while one replaces the other.
 *
 * Responsibility: the start card names its heading, tints by season or not at all, shows the
 *                 icon only with a season, the special and facts only when given, and counts
 *                 down in whole seconds never below 0 as a timer not read out. The result frame
 *                 holds headline, lines, proof, reveal, placings and more in their places, marks
 *                 its first part fixed, takes the board layout, and fits only when told. In a
 *                 docked screen the chat stays the same element from the start card to the
 *                 result. Mini Games' intro.test.tsx and result.test.tsx (apps/web/src/round at
 *                 866df03) for the rules the frames keep; the content checks stay there.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DockedScreen } from './DockedScreen.js';
import { ResultFrame } from './ResultFrame.js';
import { StartCard } from './StartCard.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the start card', () => {
  it('names its heading, tints by season and counts down as a quiet timer', () => {
    render(
      <StartCard
        game="mini-games"
        season="winter"
        title="Winter"
        icon={<svg data-testid="icon" />}
        badge={<span>Halving round</span>}
        special={<p>Every guess counts twice.</p>}
        facts={['Shared number between 1 and 100', 'Cooldown 3 s between guesses']}
        opensIn={4.2}
        signature="r1"
      />,
    );
    const card = screen.getByTestId('start-card');
    expect(card.dataset['season']).toBe('winter');
    expect(screen.getByRole('region', { name: 'Winter' })).toBe(card);
    expect(screen.getByTestId('icon').parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Halving round')).not.toBeNull();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Shared number between 1 and 100',
      'Cooldown 3 s between guesses',
    ]);
    const count = screen.getByTestId('countdown');
    expect(count.getAttribute('role')).toBe('timer');
    expect(count.getAttribute('aria-live')).toBe('off');
    expect(count.textContent).toBe('Opens in 5 s');
    expect(card.dataset['fitScale']).toBe('1');
  });

  it('shows a seasonless game without tint, icon, special or facts, never below 0 s', () => {
    render(
      <StartCard
        game="bingo"
        season={null}
        title="Seasonal Bingo Royale"
        icon={<svg data-testid="icon" />}
        opensIn={-3}
        signature="r2"
      />,
    );
    const card = screen.getByTestId('start-card');
    expect(card.hasAttribute('data-season')).toBe(false);
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(card.querySelector('.sk-start-special')).toBeNull();
    expect(screen.getByTestId('countdown').textContent).toBe('Opens in 0 s');
  });
});

describe('the result frame', () => {
  it('holds every slot in its place, the first part fixed', () => {
    render(
      <ResultFrame
        game="mini-games"
        headline="Walter found it first"
        lines={<p>found it 0.4 s before Anna</p>}
        proof={<details>Fairness proof</details>}
        reveal={<p>42</p>}
        placings={<ol aria-label="Top three" />}
        more={<p>Standings</p>}
        signature="r1"
      />,
    );
    const result = screen.getByTestId('result');
    expect(result.dataset['layout']).toBe('list');
    const first = screen.getByTestId('result-first');
    expect(first.hasAttribute('data-fit-fixed')).toBe(true);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Walter found it first');
    expect(first.querySelector('.sk-result-proof')?.textContent).toBe('Fairness proof');
    expect(first.querySelector('.sk-result-reveal')?.textContent).toBe('42');
    expect(first.querySelector('.sk-result-places ol')).not.toBeNull();
    expect(result.querySelector('.sk-result-more')?.textContent).toBe('Standings');
    // Not fitted unless asked: a result that does not fit scrolls as today.
    expect(result.dataset['fitScale']).toBeUndefined();
  });

  it('takes the board layout, fits when asked, and leaves out what is not given', () => {
    render(
      <ResultFrame
        game="mini-games"
        headline="Time is up"
        reveal={<p>grid</p>}
        placings={<p>none</p>}
        layout="board"
        fitted
        signature="r2"
      />,
    );
    const result = screen.getByTestId('result');
    expect(result.dataset['layout']).toBe('board');
    expect(result.dataset['fitScale']).toBe('1');
    expect(result.querySelector('.sk-result-proof')).toBeNull();
    expect(result.querySelector('.sk-result-more')).toBeNull();
  });
});

describe('both frames in the docked screen', () => {
  it('keep the same chat from the start card to the result', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    const dock = (children: React.ReactNode) => (
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        {children}
      </DockedScreen>
    );
    const { rerender } = render(
      dock(
        <StartCard game="mini-games" season="spring" title="Spring" opensIn={3} signature="a" />,
      ),
    );
    const chat = screen.getByTestId('chat-dock');
    rerender(
      dock(<ResultFrame game="mini-games" headline="Done" reveal="7" placings="–" signature="b" />),
    );
    expect(screen.getByTestId('chat-dock')).toBe(chat);
    expect(screen.getByTestId('result')).not.toBeNull();
  });
});
