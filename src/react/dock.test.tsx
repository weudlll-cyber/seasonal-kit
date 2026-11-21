// @vitest-environment jsdom
/**
 * @file   src/react/dock.test.tsx
 * @brief  The docked chat: strip and bar, unread only out of sight, the call slot hidden without
 *         a call id, the website frame's link, and the dock surviving round → result.
 *
 * Responsibility: on a desktop the strip shows the chat and the slot at its right end; on a
 *                 phone the bar names the newest message and the count of those that arrived
 *                 while the sheet was closed, and opening the sheet clears it; Escape and Close
 *                 shut it. The field shows only in the bar's form `field`. The slot is hidden
 *                 with no call id and shows its form with one. The frame loads the room with the
 *                 page's theme, keeps `strict-origin`, is always sandboxed, tells the
 *                 frame its visibility and hands its `unread` to the bar; outside a dock it posts
 *                 nothing. The docked screen keeps the same dock element when its content
 *                 changes, and on a phone publishes the visible viewport's height on <html>
 *                 without taking it itself. Mini Games'
 *                 chatDock.test.tsx (apps/web/src/match at 866df03) for the dock's rules.
 * Depends on:     vitest, jsdom, @testing-library/react, ../../tests/frame
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deliver } from '../../tests/frame.js';
import { ChatDock } from './ChatDock.js';
import { DockedScreen } from './DockedScreen.js';
import { useDockArrivals } from './dockSight.js';
import { WebsiteChatFrame } from './WebsiteChatFrame.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// A game's own chat room that reports one message on mount.
function Room(p: {
  readonly author: string | null;
  readonly text: string;
  readonly own?: boolean;
}) {
  const arrivals = useDockArrivals();
  useEffect(() => {
    const message = { author: p.author, text: p.text };
    if (p.own === true) arrivals?.latest(message);
    else arrivals?.arrived(message);
  }, [arrivals, p.author, p.text, p.own]);
  return <p>room</p>;
}

describe('the dock on a desktop', () => {
  it('shows the chat in the strip and the call slot at its right end, hidden without a call', () => {
    const { rerender } = render(
      <ChatDock chat={<p>chat</p>} phone={false} bar="line" callId={null} />,
    );
    expect(screen.getByTestId('chat-dock').dataset['view']).toBe('desktop');
    expect(screen.queryByTestId('chat-bar')).toBeNull();
    const slot = screen.getByTestId('call-slot');
    expect(slot.hidden).toBe(true);
    expect(slot.parentElement?.lastElementChild).toBe(slot);
    rerender(<ChatDock chat={<p>chat</p>} phone={false} bar="line" callId={7} />);
    expect(screen.getByTestId('call-slot').hidden).toBe(false);
    expect(screen.getByTestId('call-slot').className).toBe('sk-call-slot');
  });

  it('counts nothing: the chat is always in sight', () => {
    render(
      <ChatDock chat={<Room author="Ana" text="gg" />} phone={false} bar="line" callId={null} />,
    );
    expect(screen.queryByTestId('chat-unread')).toBeNull();
  });
});

describe('the dock on a phone', () => {
  it('names the newest message and counts it while the sheet is closed', () => {
    render(<ChatDock chat={<Room author="Ana" text="gg" />} phone bar="line" callId={null} />);
    expect(screen.getByTestId('chat-bar').textContent).toBe('Chat · Ana: gg1 unread');
    fireEvent.click(screen.getByTestId('chat-bar'));
    expect(screen.queryByTestId('chat-unread')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Chat' }).hidden).toBe(false);
  });

  it('lets a message that counts for nothing be the newest only', () => {
    render(
      <ChatDock chat={<Room author={null} text="Round 2" own />} phone bar="line" callId={null} />,
    );
    expect(screen.getByTestId('chat-bar').textContent).toBe('Chat · Round 2');
  });

  it('closes the sheet with Escape and with Close, the focus back on the bar', () => {
    render(<ChatDock chat={<p>chat</p>} phone bar="line" callId={null} />);
    const bar = screen.getByTestId('chat-bar');
    fireEvent.click(bar);
    fireEvent.keyDown(screen.getByTestId('chat-dock'), { key: 'Escape' });
    expect(bar.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(bar);
    fireEvent.click(bar);
    fireEvent.click(screen.getByText('Close'));
    expect(bar.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the game’s field only in the form field, and the call strip above the bar', () => {
    const field = <input aria-label="Write" />;
    const { rerender } = render(
      <ChatDock chat={<p>chat</p>} phone bar="field" field={field} callId={3} />,
    );
    expect(screen.getByLabelText('Write')).not.toBeNull();
    const slot = screen.getByTestId('call-slot');
    expect(slot.dataset['form']).toBe('strip');
    expect(slot.nextElementSibling?.contains(screen.getByTestId('chat-bar'))).toBe(true);
    rerender(<ChatDock chat={<p>chat</p>} phone bar="line" field={field} callId={3} />);
    expect(screen.queryByLabelText('Write')).toBeNull();
    rerender(<ChatDock chat={<p>chat</p>} phone bar="field" callId={3} />);
    expect(screen.queryByLabelText('Write')).toBeNull();
  });
});

// The rendered chat frame, its window's posts recorded from now on.
function frameOf(): { frame: HTMLIFrameElement; post: ReturnType<typeof vi.fn> } {
  const frame = screen.getByTestId<HTMLIFrameElement>('chat-frame');
  const post = vi.fn();
  if (frame.contentWindow !== null) frame.contentWindow.postMessage = post;
  return { frame, post };
}

describe('the website chat frame', () => {
  it('loads the room with the page theme, keeps strict-origin, and is always sandboxed (K17)', () => {
    const { rerender } = render(<WebsiteChatFrame room="bingo" />);
    const frame = screen.getByTestId('chat-frame');
    expect(frame.getAttribute('src')).toBe('/embed/chat?room=bingo&theme=auto');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin');
    expect(frame.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups',
    );
    expect(frame.getAttribute('title')).toBe('Chat');
    rerender(<WebsiteChatFrame room="mini-games" path="/x/embed/chat" />);
    expect(frame.getAttribute('src')).toBe('/x/embed/chat?room=mini-games&theme=auto');
  });
});

describe('the website chat frame in a dock', () => {
  it('in a phone dock, tells the frame whether it is in sight and hands its unread to the bar', () => {
    render(<ChatDock chat={<WebsiteChatFrame room="bingo" />} phone bar="line" callId={null} />);
    // The recorder is in place before the next connection: opening and closing the sheet.
    const { frame, post } = frameOf();
    const bar = screen.getByTestId('chat-bar');
    fireEvent.click(bar);
    fireEvent.click(bar);
    expect(post.mock.calls).toEqual([
      [{ type: 'visible', visible: true, source: 'seasonal-chat-host' }, window.location.origin],
      [{ type: 'visible', visible: false, source: 'seasonal-chat-host' }, window.location.origin],
    ]);
    act(() => {
      deliver(frame.contentWindow, {
        source: 'seasonal-chat',
        type: 'unread',
        room: 'bingo',
        count: 4,
      });
    });
    expect(screen.getByTestId('chat-unread').textContent).toBe('4 unread');
    // A message that is no count changes no count.
    act(() => {
      deliver(frame.contentWindow, { source: 'seasonal-chat', type: 'resize', height: 300 });
    });
    expect(screen.getByTestId('chat-unread').textContent).toBe('4 unread');
    // Another window's message is not the frame's.
    act(() => {
      deliver(window, { source: 'seasonal-chat', type: 'unread', room: 'bingo', count: 9 });
    });
    expect(screen.getByTestId('chat-unread').textContent).toBe('4 unread');
  });

  it('posts and counts nothing outside a dock, and takes a class of the game’s', () => {
    render(
      <>
        <WebsiteChatFrame room="bingo" className="game-frame" />
        <Room author="Ana" text="gg" />
      </>,
    );
    const { frame, post } = frameOf();
    expect(post).not.toHaveBeenCalled();
    expect(frame.className).toBe('game-frame');
    expect(screen.getByText('room')).not.toBeNull();
  });
});

describe('the docked screen', () => {
  it('keeps the same dock while its content changes from the round to the result', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    const { rerender } = render(
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        <p>round</p>
      </DockedScreen>,
    );
    const dock = screen.getByTestId('chat-dock');
    expect(dock.dataset['view']).toBe('desktop');
    rerender(
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        <p>result</p>
      </DockedScreen>,
    );
    expect(screen.getByTestId('chat-dock')).toBe(dock);
    expect(screen.getByText('result')).not.toBeNull();
  });
});

describe('the docked screen on a phone', () => {
  it('turns into the phone layout on a narrow window and follows the visible viewport', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    const listeners: (() => void)[] = [];
    const vv = {
      height: 600,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('visualViewport', vv);
    const { unmount } = render(
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        <p>round</p>
      </DockedScreen>,
    );
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const box = screen.getByTestId('docked-screen');
    const visible = () => document.documentElement.style.getPropertyValue('--sk-visible-height');
    expect(box.dataset['view']).toBe('phone');
    expect(visible()).toBe('600px');
    // The box keeps its container's height: it may sit under other parts of the page.
    expect(box.style.height).toBe('');
    vv.height = 400;
    act(() => {
      listeners.forEach((l) => {
        l();
      });
    });
    expect(visible()).toBe('400px');
    unmount();
    expect(vv.removeEventListener).toHaveBeenCalled();
    expect(visible()).toBe('');
  });

  // jsdom has none at all (undefined); some browsers report null. Both must work (v0.4.1: the
  // v0.4.0 delivery proof crashed on the missing one).
  it.each([
    ['missing', undefined],
    ['null', null],
  ])('leaves the height alone with the visual viewport %s', (_what, vv) => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    vi.stubGlobal('visualViewport', vv);
    render(
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        <p>round</p>
      </DockedScreen>,
    );
    expect(screen.getByTestId('docked-screen').dataset['view']).toBe('phone');
    expect(document.documentElement.style.getPropertyValue('--sk-visible-height')).toBe('');
  });
});
