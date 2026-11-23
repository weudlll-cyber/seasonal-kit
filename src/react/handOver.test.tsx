// @vitest-environment jsdom
/**
 * @file   src/react/handOver.test.tsx
 * @brief  A game opens the docked chat from inside the game (v0.13.0, Cases 43).
 *
 * Responsibility: `useOpenDockChat` opens the phone's sheet (and leaves it open when called
 *                 again, the bar being the game's own button), which takes the focus; on a
 *                 desktop it moves the focus into the strip's first control. It does nothing
 *                 outside a docked screen, in one `withoutChat`, or once the dock has gone, and
 *                 its identity is stable. The dock itself stays one element.
 * Source:         seasonal-cases packages/ui/src/pending/useChatHandOver.ts at 073f9ad.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DockedScreen } from './DockedScreen.js';
import { useOpenDockChat } from './dockHandOver.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The game's own "Chat" button, outside the dock.
function GameChatButton() {
  const open = useOpenDockChat();
  return (
    <button type="button" data-testid="game-chat" onClick={open}>
      Chat
    </button>
  );
}

const chat = <iframe title="Chat" data-testid="frame" />;

describe('opening the docked chat from the game', () => {
  it('opens the phone sheet, takes the focus, and stays open when pressed again', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    render(
      <DockedScreen chat={chat} bar="line" callId={null}>
        <GameChatButton />
      </DockedScreen>,
    );
    const bar = screen.getByTestId('chat-bar');
    expect(bar.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByTestId('game-chat'));
    expect(bar.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Close');
    fireEvent.click(screen.getByTestId('game-chat'));
    expect(bar.getAttribute('aria-expanded')).toBe('true');
  });

  it('focuses the strip on a desktop', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    render(
      <DockedScreen chat={chat} bar="line" callId={null}>
        <GameChatButton />
      </DockedScreen>,
    );
    fireEvent.click(screen.getByTestId('game-chat'));
    expect(document.activeElement).toBe(screen.getByTestId('frame'));
  });

  it('does nothing outside a docked screen, without a chat, or once the dock has gone', () => {
    const { unmount } = render(<GameChatButton />);
    fireEvent.click(screen.getByTestId('game-chat'));
    unmount();
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    const { rerender } = render(
      <DockedScreen chat={chat} bar="line" callId={null}>
        <GameChatButton />
      </DockedScreen>,
    );
    rerender(
      <DockedScreen withoutChat>
        <GameChatButton />
      </DockedScreen>,
    );
    const button = screen.getByTestId('game-chat');
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(screen.queryByTestId('chat-dock')).toBeNull();
  });
});
