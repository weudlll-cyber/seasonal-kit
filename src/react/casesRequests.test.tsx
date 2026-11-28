// @vitest-environment jsdom
/**
 * @file   src/react/casesRequests.test.tsx
 * @brief  Seasonal Cases' requests of the kit (v0.11.0): the dock reserve without a chat, the
 *         unread count for the bar, a bar toggle, and a chat frame from this PC's dev server.
 *
 * Responsibility: `useDockReserve` is the strip's 190 px on a desktop, 100 px in a window under
 *                 760 px high, nothing on a phone, and follows a resize (20). `ChatDock`'s
 *                 `onUnread` hears each new count (24). A `GameBar` toggle says whether it is on
 *                 with `aria-pressed`, shows it in its icon, keeps its words, and switches on a
 *                 click (36). `OriginChatFrame` frames a loopback origin's embed page and renders
 *                 nothing for any other origin, so no production origin is framed (23). Plain
 *                 DOM queries: role queries are slow in jsdom under load.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         seasonal-cases docs/BACKLOG.md 20, 23, 24, 36 and packages/ui/src/pending/ at
 *                 cc75504
 */
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatDock } from './ChatDock.js';
import { useDockArrivals } from './dockSight.js';
import { GameBar } from './GameBar.js';
import { usePanels } from './usePanels.js';
import { useDockReserve } from './useDockReserve.js';
import { OriginChatFrame } from './WebsiteChatFrame.js';

const size = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the dock reserve without a chat (Cases 20)', () => {
  it('keeps the strip’s height free on a desktop, the low strip’s in a low window, none on a phone', () => {
    size(1280, 800);
    const { result } = renderHook(() => useDockReserve());
    expect(result.current).toBe(190);
    act(() => {
      size(1280, 700);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(100);
    act(() => {
      size(390, 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(0);
  });
});

describe('the unread count for the bar (Cases 24)', () => {
  it('hands each new count to the game', () => {
    const onUnread = vi.fn();
    const room: { arrivals: ReturnType<typeof useDockArrivals> } = { arrivals: null };
    function Room() {
      room.arrivals = useDockArrivals();
      return <p>room</p>;
    }
    render(<ChatDock chat={<Room />} phone bar="line" callId={null} onUnread={onUnread} />);
    expect(onUnread).toHaveBeenLastCalledWith(0);
    act(() => room.arrivals?.arrived({ author: 'Ana', text: 'gg' }));
    expect(onUnread).toHaveBeenLastCalledWith(1);
  });
});

describe('a toggle in the game bar (Cases 36)', () => {
  function Bar(p: { readonly on: boolean; readonly onToggle: () => void }) {
    const panels = usePanels<'chat'>();
    return (
      <GameBar
        time={null}
        actions={[]}
        toggles={[{ id: 'sound', icon: 'sound', label: 'Sound', testId: 'sound', ...p }]}
        panels={panels}
      />
    );
  }

  it('says and shows whether it is on, keeps its words, and switches on a click', () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(<Bar on onToggle={onToggle} />);
    const button = container.querySelector<HTMLButtonElement>('[data-testid="sound"]');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.textContent).toBe('Sound');
    const onIcon = button?.querySelector('path')?.getAttribute('d');
    fireEvent.click(button as HTMLButtonElement);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<Bar on={false} onToggle={onToggle} />);
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(button?.querySelector('path')?.getAttribute('d')).not.toBe(onIcon);
  });
});

describe('the chat frame from this PC’s dev server (Cases 23)', () => {
  it('frames a loopback origin’s embed page', () => {
    for (const origin of [
      'http://localhost:5380',
      'https://127.0.0.1:5380/',
      'http://[::1]:5380',
    ]) {
      const { container, unmount } = render(<OriginChatFrame origin={origin} room="cases" />);
      const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
      expect(new URL(src).origin).toBe(new URL(origin).origin);
      expect(src).toContain('/embed/chat?room=cases&theme=');
      unmount();
    }
  });

  it('renders nothing for any origin not on this PC, or not an origin at all', () => {
    for (const origin of [
      'https://seasonal.example',
      'https://localhost.seasonal.example',
      'http://localhost:5380/embed',
      'file://localhost/',
      'not a url',
    ]) {
      const { container, unmount } = render(<OriginChatFrame origin={origin} room="cases" />);
      expect(container.querySelector('iframe')).toBeNull();
      unmount();
    }
  });
});
