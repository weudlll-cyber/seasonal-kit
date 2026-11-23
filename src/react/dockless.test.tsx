// @vitest-environment jsdom
/**
 * @file   src/react/dockless.test.tsx
 * @brief  The docked screen with no chat, and the dock's visibility signal for a game's own
 *         frame (both new in v0.12.0).
 *
 * Responsibility: `withoutChat` renders the content and nothing else: no dock, no strip, no
 *                 sheet, no call slot, on a desktop and on a phone, and on a phone it still
 *                 publishes the visible viewport's height as the docked layout does, following
 *                 the keyboard and letting go on unmount. `withoutChat={false}` is the docked
 *                 layout as before. `useDockSight` is null outside a dock; in one it says whether
 *                 the chat is in sight (always on a desktop, while the sheet is open on a phone)
 *                 and its arrivals count what comes while it is not, shown on the bar.
 * Source:         Mini Games DECISIONS T416 (the requests); kit v0.12.0.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatDock } from './ChatDock.js';
import { DockedScreen } from './DockedScreen.js';
import { useDockSight } from './dockSight.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const visibleHeight = (): string =>
  document.documentElement.style.getPropertyValue('--sk-visible-height');

describe('the docked screen without a chat', () => {
  it('has no dock of any kind on a desktop', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    render(
      <DockedScreen withoutChat>
        <p>round</p>
      </DockedScreen>,
    );
    expect(screen.getByTestId('docked-screen').dataset['skView']).toBe('desktop');
    expect(screen.getByText('round')).not.toBeNull();
    expect(screen.queryByTestId('chat-dock')).toBeNull();
    expect(screen.queryByTestId('call-slot')).toBeNull();
  });

  it('still follows the on-screen keyboard on a phone, and lets go on unmount', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    const listeners: (() => void)[] = [];
    const vv = {
      height: 600,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('visualViewport', vv);
    const { unmount } = render(
      <DockedScreen withoutChat>
        <p>round</p>
      </DockedScreen>,
    );
    expect(screen.getByTestId('docked-screen').dataset['skView']).toBe('phone');
    expect(screen.queryByTestId('chat-bar')).toBeNull();
    expect(visibleHeight()).toBe('600px');
    vv.height = 380;
    act(() => {
      listeners.forEach((l) => {
        l();
      });
    });
    expect(visibleHeight()).toBe('380px');
    unmount();
    expect(visibleHeight()).toBe('');
  });

  it('is the docked layout when withoutChat is false', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    render(
      <DockedScreen withoutChat={false} chat={<p>chat</p>} bar="line" callId={null}>
        <p>round</p>
      </DockedScreen>,
    );
    expect(screen.getByTestId('chat-dock')).not.toBeNull();
  });
});

// A game's own frame in the dock: says whether it is in sight and reports one arrival.
function OwnFrame() {
  const sight = useDockSight();
  const arrivals = sight?.arrivals;
  useEffect(() => {
    arrivals?.arrived({ author: 'Ann', text: 'hello' });
  }, [arrivals]);
  return <p data-testid="sight">{sight === null ? 'no dock' : String(sight.visible)}</p>;
}

describe('the dock sight hook', () => {
  it('is null outside a dock', () => {
    render(<OwnFrame />);
    expect(screen.getByTestId('sight').textContent).toBe('no dock');
  });

  it('says the chat is in sight on a desktop, always', () => {
    render(<ChatDock chat={<OwnFrame />} phone={false} bar="line" callId={null} />);
    expect(screen.getByTestId('sight').textContent).toBe('true');
    expect(screen.queryByTestId('chat-unread')).toBeNull();
  });

  it('follows the phone sheet, and its arrivals count only while it is shut', () => {
    render(<ChatDock chat={<OwnFrame />} phone bar="line" callId={null} />);
    expect(screen.getByTestId('sight').textContent).toBe('false');
    expect(screen.getByTestId('chat-unread').textContent).toBe('1 unread');
    fireEvent.click(screen.getByTestId('chat-bar'));
    expect(screen.getByTestId('sight').textContent).toBe('true');
    expect(screen.queryByTestId('chat-unread')).toBeNull();
  });
});
