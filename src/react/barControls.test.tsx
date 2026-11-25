// @vitest-environment jsdom
/**
 * @file   src/react/barControls.test.tsx
 * @brief  The game bar's panel buttons name the panel they open (v0.20.0, audit A-02).
 *
 * Responsibility: an action with `controls` renders it as the button's `aria-controls`, next to
 *                 `aria-expanded`, which still says whether its panel is the open one; an action
 *                 without it has no `aria-controls`, as before. The bar cannot know the game's
 *                 panel, so the game names its id; the bar writes it as given.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit (the 2026-11-22 audit B7, "no aria-controls on the panel buttons").
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GameBar } from './GameBar.js';
import { usePanels } from './usePanels.js';

afterEach(cleanup);

function Bar() {
  const panels = usePanels<'chat' | 'players'>();
  return (
    <GameBar
      time={null}
      panels={panels}
      actions={[
        { id: 'chat', icon: 'chat', label: 'Chat', testId: 'chat', controls: 'chat-panel' },
        { id: 'players', icon: 'players', label: 'Players', testId: 'players' },
      ]}
    />
  );
}

describe('the panel buttons', () => {
  it('write the panel they open as aria-controls, and only when the game names it', () => {
    render(<Bar />);
    expect(screen.getByTestId('chat').getAttribute('aria-controls')).toBe('chat-panel');
    expect(screen.getByTestId('players').hasAttribute('aria-controls')).toBe(false);
  });

  it('still say whether the panel is open', () => {
    render(<Bar />);
    const chat = screen.getByTestId('chat');
    expect(chat.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(chat);
    expect(chat.getAttribute('aria-expanded')).toBe('true');
    expect(chat.getAttribute('aria-controls')).toBe('chat-panel');
  });
});
