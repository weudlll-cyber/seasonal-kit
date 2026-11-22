// @vitest-environment jsdom
/**
 * @file   src/react/bar.test.tsx
 * @brief  The round's focus mode: the game bar, its panels one at a time, full screen, the
 *         focus mark, the phase strip with "· now", and the clock.
 *
 * Responsibility: the bar shows the lead, its facts (a desktop-only one marked so), the time
 *                 with " left", one button per action with its words and an unread count only
 *                 above 0, and the full-screen toggle only where supported. Its buttons open one
 *                 panel at a time and closing hands the focus back. Full screen follows the
 *                 browser and refuses quietly. The focus mark stays while any screen holds it.
 *                 The strip marks the part now in words and with aria-current, fills it, marks
 *                 ended parts done and nothing "now" in the hold. The clock rounds down, never
 *                 below 0:00. Mini Games' focus.test.tsx and Mind Games' phases.test.tsx (866df03)
 *                 for the rules.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clockText } from '../clock.js';
import { GameBar } from './GameBar.js';
import { PhaseStrip } from './PhaseStrip.js';
import { useFocusMode } from './useFocusMode.js';
import { useFullscreen } from './useFullscreen.js';
import { usePanels } from './usePanels.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Id = 'chat' | 'players';

function Bar(p: { readonly unread: number; readonly full?: boolean }) {
  const panels = usePanels<Id>();
  const fullscreen = { supported: p.full ?? false, on: false, toggle: vi.fn() };
  return (
    <>
      <GameBar
        lead={<span>Winter</span>}
        facts={[{ text: 'Shared', desktopOnly: true }, { text: 'Team' }]}
        time={{ text: '9:50', left: true }}
        actions={[
          { id: 'chat', icon: 'chat', label: 'Chat', testId: 'bar-chat', badge: p.unread },
          { id: 'players', icon: 'players', label: 'Players', testId: 'bar-players' },
        ]}
        panels={panels}
        fullscreen={fullscreen}
        buttonClassName="smg-btn"
      />
      <p data-testid="open">{panels.open ?? 'none'}</p>
      <button type="button" onClick={panels.close}>
        close
      </button>
    </>
  );
}

describe('the game bar', () => {
  it('shows the lead, the facts, the time and the buttons with their words', () => {
    render(<Bar unread={3} />);
    expect(screen.getByText('Shared').className).toBe('sk-bar-fact sk-bar-desktop');
    expect(screen.getByText('Team').className).toBe('sk-bar-fact');
    expect(screen.getByTestId('bar-time').textContent).toBe('9:50 left');
    expect(screen.getByTestId('bar-chat').className).toBe('sk-bar-button smg-btn');
    expect(screen.getByTestId('bar-chat').textContent).toBe('Chat3 unread');
    expect(screen.getByTestId('bar-players').textContent).toBe('Players');
    expect(screen.queryByTestId('bar-fullscreen')).toBeNull();
  });

  it('opens one panel at a time and hands the focus back on closing', () => {
    render(<Bar unread={0} />);
    const chat = screen.getByTestId('bar-chat');
    expect(screen.queryByTestId('bar-unread')).toBeNull();
    fireEvent.click(chat);
    expect(screen.getByTestId('open').textContent).toBe('chat');
    expect(chat.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByTestId('bar-players'));
    expect(screen.getByTestId('open').textContent).toBe('players');
    fireEvent.click(screen.getByTestId('bar-players'));
    expect(screen.getByTestId('open').textContent).toBe('none');
    expect(document.activeElement).toBe(screen.getByTestId('bar-players'));
    fireEvent.click(screen.getByText('close'));
    expect(screen.getByTestId('open').textContent).toBe('none');
  });
});

describe('the game bar: time and full screen', () => {
  it('shows the full-screen toggle where supported, and no time before the round opens', () => {
    const panels = { open: null, toggle: vi.fn(), close: vi.fn(), button: () => () => undefined };
    const toggle = vi.fn();
    render(
      <GameBar
        actions={[]}
        panels={panels}
        time={null}
        fullscreen={{ supported: true, on: true, toggle }}
      />,
    );
    const button = screen.getByTestId('bar-fullscreen');
    expect(button.textContent).toBe('Leave full screen');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.className).toBe('sk-bar-button');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalled();
    expect(screen.queryByTestId('bar-time')).toBeNull();
  });

  it('shows a time without " left" in the hold before the result', () => {
    const panels = { open: null, toggle: vi.fn(), close: vi.fn(), button: () => () => undefined };
    render(<GameBar actions={[]} panels={panels} time={{ text: 'Result in 0:04', left: false }} />);
    expect(screen.getByTestId('bar-time').textContent).toBe('Result in 0:04');
  });

  it('says Full screen while off and leaves the time out when none is given', () => {
    const panels = { open: null, toggle: vi.fn(), close: vi.fn(), button: () => () => undefined };
    render(
      <GameBar
        actions={[]}
        panels={panels}
        time={null}
        fullscreen={{ supported: true, on: false, toggle: vi.fn() }}
      />,
    );
    expect(screen.getByTestId('bar-fullscreen').textContent).toBe('Full screen');
    expect(screen.queryByTestId('bar-time')).toBeNull();
  });
});

describe('full screen', () => {
  function useScreen() {
    const ref = useRef<HTMLDivElement | null>(document.createElement('div'));
    return { ref, fullscreen: useFullscreen(ref) };
  }

  it('is not offered where the browser has no Fullscreen API', () => {
    const { result } = renderHook(useScreen);
    expect(result.current.fullscreen.supported).toBe(false);
  });

  it('is never offered inside another page’s frame', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
    const { result } = renderHook(useScreen);
    expect(result.current.fullscreen.supported).toBe(false);
  });

  it('follows the browser, requests and leaves, and refuses quietly', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    const request = vi.fn(() => Promise.reject(new Error('no gesture')));
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: request,
      configurable: true,
    });
    let current: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => current,
      configurable: true,
    });
    // Leaving may be refused too; the toggle stays quiet.
    const exit = vi.fn(() => Promise.reject(new Error('refused')));
    Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true });
    const { result } = renderHook(useScreen);
    expect(result.current.fullscreen.supported).toBe(true);
    const target = result.current.ref.current as HTMLDivElement;
    target.requestFullscreen = request;
    await act(async () => {
      result.current.fullscreen.toggle();
      await Promise.resolve();
    });
    expect(request).toHaveBeenCalled();
    current = target;
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.fullscreen.on).toBe(true);
    await act(async () => {
      result.current.fullscreen.toggle();
      await Promise.resolve();
    });
    expect(exit).toHaveBeenCalled();
  });
});

describe('the focus mode', () => {
  it('marks <html> while any screen holds it, and not when inactive', () => {
    const root = document.documentElement;
    const a = renderHook(() => {
      useFocusMode();
    });
    const b = renderHook(() => {
      useFocusMode();
    });
    const off = renderHook(() => {
      useFocusMode(false);
    });
    expect(root.hasAttribute('data-sk-focus')).toBe(true);
    a.unmount();
    expect(root.hasAttribute('data-sk-focus')).toBe(true);
    b.unmount();
    off.unmount();
    expect(root.hasAttribute('data-sk-focus')).toBe(false);
  });
});

const PARTS = [
  { id: 'join', name: 'Join', from: 0, to: 30_000 },
  { id: 'play', name: 'Play', from: 30_000, to: 60_000 },
  { id: 'reveal', name: 'Reveal', from: 60_000, to: 75_000 },
];

describe('the phase strip', () => {
  it('marks the part now in words and for screen readers, and fills it as it runs', () => {
    render(
      <PhaseStrip
        parts={PARTS}
        at={45_000}
        label="The round's phases"
        line="You see the round 10 s late"
        status="Joining has closed."
      />,
    );
    const parts = screen.getAllByRole('listitem');
    expect(parts.map((li) => li.textContent)).toEqual([
      'Join until 0:30',
      'Play · now until 1:00',
      'Reveal until 1:15',
    ]);
    expect(parts[1]?.getAttribute('aria-current')).toBe('step');
    expect(parts[0]?.dataset['done']).toBe('true');
    expect(parts[1]?.querySelector<HTMLElement>('.sk-phase-fill')?.style.width).toBe('50%');
    expect(screen.getByRole('status').textContent).toBe('Joining has closed.');
    expect(screen.getByText('You see the round 10 s late')).not.toBeNull();
    expect(screen.getByRole('list', { name: "The round's phases" })).not.toBeNull();
  });

  it('has nothing now in the hold after the last part, nor without timing', () => {
    const { rerender } = render(<PhaseStrip parts={PARTS} at={80_000} label="Phases" />);
    expect(document.querySelector('[aria-current]')).toBeNull();
    expect(screen.getAllByRole('listitem').every((li) => li.dataset['done'] === 'true')).toBe(true);
    rerender(<PhaseStrip parts={PARTS} at={null} label="Phases" />);
    expect(document.querySelector('[aria-current]')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('.sk-phase-line')).toBeNull();
  });
});

describe('the clock', () => {
  it('writes minutes and two-digit seconds, rounding down, never below 0:00', () => {
    expect(clockText(590_999)).toBe('9:50');
    expect(clockText(5_000)).toBe('0:05');
    expect(clockText(-1)).toBe('0:00');
  });
});
