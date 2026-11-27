// @vitest-environment jsdom
/**
 * @file   src/react/sharedCall.test.tsx
 * @brief  The shared call's slot and the way back, against a stand-in view (K77).
 *
 * Responsibility: the frame loads `/embed/call/shared` with no call number, hidden; a live call
 *                 shows the box and gives its id; a scheduled one stays hidden; `ended` hides it
 *                 (also with the reason `unshared`) and a later share shows it again; `resize` changes the form; the view is told
 *                 whether it is in sight; messages from another window or origin are ignored; a
 *                 theme change loads the view anew; and "Back to the call" links to the live call
 *                 only; a dock given `onSharedCall` holds this slot, in both layouts, and the
 *                 linked call's otherwise. The view is a stub: the messages are the contract's.
 * Depends on:     vitest, @testing-library/react
 * Source:         new in the kit (K77).
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sharedCallEmbedUrl } from '../callView.js';
import { ChatDock } from './ChatDock.js';
import { BackToCall, SharedCallSlot } from './SharedCall.js';

afterEach(cleanup);

const posted: unknown[] = [];
beforeEach(() => {
  posted.length = 0;
  window.innerHeight = 900;
});

const frame = (): HTMLIFrameElement => screen.getByTestId<HTMLIFrameElement>('shared-call-frame');
const box = (): HTMLElement => screen.getByTestId('shared-call-slot');

// The view says something, from its own window and the page's origin unless named otherwise.
function says(data: object, origin = window.location.origin, source?: Window | null): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'seasonal-call', ...data },
        origin,
        source: source === undefined ? frame().contentWindow : source,
      }),
    );
  });
}
const ready = (call: number, status = 'live') => ({
  type: 'ready',
  call,
  status,
  signedIn: true,
});

function mounted(phone = false) {
  const onCall = vi.fn();
  const view = render(<SharedCallSlot phone={phone} onCall={onCall} />);
  const own = frame().contentWindow;
  if (own) own.postMessage = ((m: unknown) => posted.push(m)) as typeof own.postMessage;
  return { onCall, view };
}
const visible = (): unknown[] =>
  posted.map((m) => (m as { visible?: boolean }).visible).filter((v) => v !== undefined);

describe('SharedCallSlot', () => {
  it('frames the shared view with no call number, hidden until a call is live', () => {
    const { onCall } = mounted();
    expect(frame().getAttribute('src')).toBe('/embed/call/shared?theme=auto');
    expect(frame().getAttribute('allow')).toBe('autoplay; fullscreen');
    expect(box().hidden).toBe(true);
    expect(onCall).toHaveBeenLastCalledWith(null);
    says(ready(9, 'scheduled'));
    expect(box().hidden).toBe(true);
  });

  it('shows the box for a live call, gives its id and tells the view it is in sight', () => {
    const { onCall } = mounted();
    says(ready(9));
    expect(box().hidden).toBe(false);
    expect(box().getAttribute('data-sk-form')).toBe('picture');
    expect(onCall).toHaveBeenLastCalledWith(9);
    expect(visible().at(-1)).toBe(true);
    expect(posted.at(-1)).toMatchObject({ source: 'seasonal-call-host' });
  });

  it('hides it when the call ended, and shows the next one', () => {
    const { onCall } = mounted();
    says(ready(9));
    says({ type: 'ended', reason: 'ended' });
    expect(box().hidden).toBe(true);
    expect(onCall).toHaveBeenLastCalledWith(null);
    expect(visible().at(-1)).toBe(false);
    says(ready(12));
    expect(box().hidden).toBe(false);
    expect(onCall).toHaveBeenLastCalledWith(12);
  });

  it('hides it when the call is no longer shared, and shows the next one under its id', () => {
    const { onCall } = mounted();
    says(ready(9));
    says({ type: 'ended', reason: 'unshared' });
    expect(box().hidden).toBe(true);
    expect(onCall).toHaveBeenLastCalledWith(null);
    says(ready(12));
    expect(box().hidden).toBe(false);
    expect(onCall).toHaveBeenLastCalledWith(12);
  });
});

describe('SharedCallSlot’s forms, strangers and path', () => {
  it('starts as the strip on a phone and takes the form the view asks for', () => {
    mounted(true);
    says(ready(9));
    expect(box().getAttribute('data-sk-form')).toBe('strip');
    says({ type: 'resize', mode: 'picture', width: 360, height: 202 });
    expect(box().getAttribute('data-sk-form')).toBe('phone-picture');
  });

  it('ignores another origin and another window', () => {
    mounted();
    says(ready(9), 'https://evil.example');
    says(ready(9), window.location.origin, window);
    expect(box().hidden).toBe(true);
  });

  it('loads the view anew for a new path, knowing of no call', () => {
    const { onCall, view } = mounted();
    says(ready(9));
    view.rerender(<SharedCallSlot phone={false} onCall={onCall} callPath="/x/call" />);
    expect(frame().getAttribute('src')).toBe('/x/call/shared?theme=auto');
    expect(box().hidden).toBe(true);
  });

  it('refuses a path that is not on this site', () => {
    expect(() => sharedCallEmbedUrl('dark', 'https://evil.example')).toThrow(TypeError);
  });
});

describe('the docked chat’s slot', () => {
  it.each([false, true])('holds the shared view when asked, phone: %s', (phone) => {
    const onCall = vi.fn();
    render(<ChatDock chat={null} bar="line" callId={null} phone={phone} onSharedCall={onCall} />);
    expect(screen.queryByTestId('call-slot')).toBeNull();
    says(ready(9));
    expect(box().getAttribute('data-sk-form')).toBe(phone ? 'strip' : 'picture');
    expect(onCall).toHaveBeenLastCalledWith(9);
  });

  it('frames nothing of the shared call without it, as in standalone mode', () => {
    render(
      <ChatDock chat={null} bar="line" callId={null} phone={false} onSharedCall={undefined} />,
    );
    expect(screen.queryByTestId('shared-call-slot')).toBeNull();
    expect(screen.getByTestId('call-slot').hidden).toBe(true);
    expect(screen.queryByTitle('Call')).toBeNull();
  });
});

describe('BackToCall', () => {
  it('links to the live call, and shows nothing without one', () => {
    const view = render(<BackToCall callId={null} />);
    expect(screen.queryByTestId('back-to-call')).toBeNull();
    view.rerender(<BackToCall callId={7} />);
    const link = screen.getByRole('link', { name: 'Back to the call' });
    expect(link.getAttribute('href')).toBe('/calls/7');
    expect(link.className).toBe('sk-bar-button');
    view.rerender(<BackToCall callId={7} className="mine" />);
    expect(screen.getByRole('link').className).toBe('mine');
  });
});
