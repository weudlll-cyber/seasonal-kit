/**
 * @file   src/chatArrivals.test.ts
 * @brief  The docked strip's and phone bar's unread count and newest message.
 *
 * Responsibility: another player's message counts only while the chat is out of sight;
 *                 showing it clears the count; a message that counts for nothing only becomes
 *                 the newest; the frame's own count replaces the kit's; every change is told.
 *                 The bar's text: "author: text", a system line alone, nothing for a deleted
 *                 message. Mini Games' `useArrivals` and `barText` (match/ChatDock.tsx, 91b23bc)
 *                 without React.
 * Depends on:     vitest
 */
import { describe, expect, it, vi } from 'vitest';

import { chatBarText, createChatArrivals } from './chatArrivals.js';

const ana = { author: 'Ana', text: 'gg' };

describe('the chat arrivals', () => {
  it('count another player’s messages only while out of sight', () => {
    const arrivals = createChatArrivals(true, vi.fn());
    arrivals.arrived(ana);
    expect(arrivals.state()).toEqual({ unread: 0, newest: ana });
    arrivals.setVisible(false);
    arrivals.arrived(ana);
    arrivals.arrived({ author: 'Ben', text: 'hi' });
    expect(arrivals.state()).toEqual({ unread: 2, newest: { author: 'Ben', text: 'hi' } });
    arrivals.setVisible(true);
    expect(arrivals.state().unread).toBe(0);
  });

  it('let a message that counts for nothing become the newest only', () => {
    const arrivals = createChatArrivals(false, vi.fn());
    const system = { author: null, text: 'Round 2 starts' };
    arrivals.latest(system);
    expect(arrivals.state()).toEqual({ unread: 0, newest: system });
  });

  it('take the frame’s own count', () => {
    const arrivals = createChatArrivals(false, vi.fn());
    arrivals.arrived(ana);
    arrivals.frameUnread(5);
    expect(arrivals.state()).toEqual({ unread: 5, newest: ana });
  });

  it('tell every change, but not going out of sight, which changes nothing shown', () => {
    const changed = vi.fn();
    const arrivals = createChatArrivals(true, changed);
    arrivals.setVisible(false);
    expect(changed).not.toHaveBeenCalled();
    arrivals.arrived(ana);
    expect(changed).toHaveBeenLastCalledWith({ unread: 1, newest: ana });
    arrivals.setVisible(true);
    expect(changed).toHaveBeenLastCalledWith({ unread: 0, newest: ana });
  });
});

describe('the bar text', () => {
  it('names the author, shows a system line alone and nothing deleted or absent', () => {
    expect(chatBarText(ana)).toBe('Ana: gg');
    expect(chatBarText({ author: null, text: 'Round 2 starts' })).toBe('Round 2 starts');
    expect(chatBarText({ author: 'Ana', text: null })).toBeNull();
    expect(chatBarText(null)).toBeNull();
  });
});
