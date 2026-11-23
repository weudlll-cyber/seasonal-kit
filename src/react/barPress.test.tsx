// @vitest-environment jsdom
/**
 * @file   src/react/barPress.test.tsx
 * @brief  The game bar's press action: a button that only sends a press (v0.13.0, Cases 41).
 *
 * Responsibility: a press button has its icon and words like the bar's other buttons, calls its
 *                 handler once per click, and carries neither `aria-expanded` (it opens no
 *                 panel) nor `aria-pressed` (it switches no setting). It sits after the toggles
 *                 and before the panel buttons, takes the game's `buttonClassName`, shows its
 *                 `tip` as the title, and without `presses` the bar has none.
 * Source:         seasonal-cases packages/ui/src/pending/BarPress.tsx at 073f9ad ("Applaud").
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameBar } from './GameBar.js';

afterEach(cleanup);

const panels = { open: null, toggle: vi.fn(), close: vi.fn(), button: () => () => undefined };

describe('the game bar: a press action', () => {
  it('sends one press per click and is neither a panel nor a toggle', () => {
    const onPress = vi.fn();
    render(
      <GameBar
        actions={[]}
        panels={panels}
        time={null}
        buttonClassName="sc-btn"
        presses={[
          {
            id: 'applaud',
            icon: 'applaud',
            label: 'Applaud',
            tip: 'Applaud the host',
            onPress,
            testId: 'press',
          },
        ]}
      />,
    );
    const button = screen.getByTestId('press');
    expect(button.textContent).toBe('Applaud');
    expect(button.getAttribute('title')).toBe('Applaud the host');
    expect(button.className).toBe('sk-bar-button sc-btn');
    expect(button.hasAttribute('aria-expanded')).toBe(false);
    expect(button.hasAttribute('aria-pressed')).toBe(false);
    expect(button.querySelector('svg.sk-bar-icon path')?.getAttribute('d')).toMatch(/^M9 21l-3-6/);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});

describe('the game bar: where a press action sits', () => {
  it('sits after the toggles and before the panel buttons, and is absent without `presses`', () => {
    const { rerender } = render(
      <GameBar
        actions={[{ id: 'chat', icon: 'chat', label: 'Chat', testId: 'chat' }]}
        toggles={[
          { id: 's', icon: 'sound', label: 'Sound', on: true, onToggle: vi.fn(), testId: 'sound' },
        ]}
        presses={[
          { id: 'applaud', icon: 'applaud', label: 'Applaud', onPress: vi.fn(), testId: 'press' },
        ]}
        panels={panels}
        time={null}
      />,
    );
    const order = [...screen.getByTestId('game-bar').querySelectorAll('button')].map(
      (b) => b.dataset['testid'] ?? '',
    );
    expect(order).toEqual(['sound', 'press', 'chat']);
    expect(screen.getByTestId('press').hasAttribute('title')).toBe(false);
    rerender(
      <GameBar
        actions={[{ id: 'chat', icon: 'chat', label: 'Chat', testId: 'chat' }]}
        panels={panels}
        time={null}
      />,
    );
    expect(screen.queryByTestId('press')).toBeNull();
  });
});
