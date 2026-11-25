// @vitest-environment jsdom
/**
 * @file   src/react/callFrame.test.tsx
 * @brief  The call view in the dock's slot: framed only with a call id, with `autoplay;
 *         fullscreen` and nothing more, following the view (v0.13.0, BACKLOG 8).
 *
 * Responsibility: no call id, no frame and a hidden slot. With one the frame loads
 *                 `/embed/call/<id>?theme=` (the game's own path if given), titled "Call",
 *                 sandboxed, allowing exactly `autoplay; fullscreen`. The view's `resize` moves
 *                 the slot to the collapsed form and back (a phone starts in the strip), its
 *                 `ended` hides the slot until another call is linked, and a message from
 *                 another origin or window moves nothing.
 * Source:         Seasonal Entertainment docs/GAME-INTEGRATION.md §9.
 * Depends on:     vitest, jsdom, @testing-library/react, ../../tests/frame
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { deliver } from '../../tests/frame.js';
import { CallSlotBox } from './CallSlotBox.js';

afterEach(cleanup);

const frameWindow = (): Window | null =>
  screen.getByTestId<HTMLIFrameElement>('call-frame').contentWindow;

const say = (data: Record<string, unknown>, origin?: string, from = frameWindow()): void => {
  act(() => {
    deliver(from, { source: 'seasonal-call', ...data }, origin);
  });
};

describe('the call slot with a call', () => {
  it('frames nothing without a call id, and the slot stays hidden', () => {
    render(<CallSlotBox callId={null} phone={false} />);
    expect(screen.getByTestId('call-slot').hidden).toBe(true);
    expect(screen.queryByTestId('call-frame')).toBeNull();
  });

  it('frames the view with autoplay and fullscreen only, on the game’s path if it has one', () => {
    const { rerender } = render(<CallSlotBox callId={7} phone={false} />);
    const frame = screen.getByTestId('call-frame');
    expect(frame.getAttribute('src')).toBe('/embed/call/7?theme=auto');
    expect(frame.getAttribute('allow')).toBe('autoplay; fullscreen');
    expect(frame.getAttribute('title')).toBe('Call');
    // As the chat frame: the site gets the origin, never the path of the game's page (v0.20.0).
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin');
    expect(frame.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
    );
    expect(screen.getByTestId('call-slot').hidden).toBe(false);
    rerender(<CallSlotBox callId={7} phone={false} callPath="/games/x/embed/call/" />);
    expect(screen.getByTestId('call-frame').getAttribute('src')).toBe(
      '/games/x/embed/call/7?theme=auto',
    );
  });

  it('follows the view between its picture and its collapsed form', () => {
    render(<CallSlotBox callId={7} phone={false} />);
    const slot = screen.getByTestId('call-slot');
    expect(slot.dataset['skForm']).toMatch(/^(picture|low)$/);
    say({ type: 'resize', mode: 'collapsed', width: 48, height: 190 });
    expect(slot.dataset['skForm']).toBe('collapsed');
    say({ type: 'resize', mode: 'picture', width: 338, height: 190 });
    expect(slot.dataset['skForm']).toMatch(/^(picture|low)$/);
  });

  it('starts a phone in the strip, and opens the picture when the view asks', () => {
    render(<CallSlotBox callId={7} phone />);
    const slot = screen.getByTestId('call-slot');
    expect(slot.dataset['skForm']).toBe('strip');
    say({ type: 'resize', mode: 'picture', width: 390, height: 219 });
    expect(slot.dataset['skForm']).toBe('phone-picture');
  });

  it('hides when the call ended, shows again for another call, and ignores strangers', () => {
    const { rerender } = render(<CallSlotBox callId={7} phone={false} />);
    const slot = screen.getByTestId('call-slot');
    say({ type: 'resize', mode: 'collapsed', width: 48, height: 190 }, 'https://evil.example');
    say({ type: 'resize', mode: 'collapsed', width: 48, height: 190 }, undefined, window);
    expect(slot.dataset['skForm']).not.toBe('collapsed');
    say({ type: 'ended', reason: 'gone' });
    expect(slot.hidden).toBe(true);
    expect(screen.queryByTestId('call-frame')).toBeNull();
    rerender(<CallSlotBox callId={8} phone={false} />);
    expect(screen.getByTestId('call-slot').hidden).toBe(false);
    expect(screen.getByTestId('call-frame').getAttribute('src')).toBe('/embed/call/8?theme=auto');
  });
});
