// @vitest-environment jsdom
/**
 * @file   src/react/dockAnnounce.test.tsx
 * @brief  The docked chat tells a screen reader when its unread count changes.
 *
 * Responsibility: the dock's live region (role status, polite) is in the page from the first
 *                 render and empty; each changed count is said once ("2 unread chat
 *                 messages"), and nothing once the chat is read. Audit 2026-11-22 "Noted, not
 *                 changed" (B7 info), v0.10.1.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatDock } from './ChatDock.js';
import { useDockArrivals } from './dockSight.js';

afterEach(() => {
  cleanup();
});

describe('the unread count for screen readers (v0.10.1)', () => {
  it('says nothing at first, then each changed count politely, and nothing once read', () => {
    const room: { arrivals: ReturnType<typeof useDockArrivals> } = { arrivals: null };
    function Pushable() {
      room.arrivals = useDockArrivals();
      return <p>room</p>;
    }
    render(<ChatDock chat={<Pushable />} phone bar="line" callId={null} />);
    const said = screen.getByTestId('chat-announce');
    expect(said.getAttribute('role')).toBe('status');
    expect(said.getAttribute('aria-live')).toBe('polite');
    expect(said.textContent).toBe('');
    act(() => room.arrivals?.arrived({ author: 'Ana', text: 'gg' }));
    expect(said.textContent).toBe('1 unread chat message');
    act(() => room.arrivals?.arrived({ author: 'Bo', text: 'wp' }));
    expect(said.textContent).toBe('2 unread chat messages');
    fireEvent.click(screen.getByTestId('chat-bar'));
    expect(said.textContent).toBe('');
  });

  it('says nothing on a desktop, where the chat is always in sight', () => {
    render(<ChatDock chat={<p>chat</p>} phone={false} bar="line" callId={null} />);
    expect(screen.getByTestId('chat-announce').textContent).toBe('');
  });
});
