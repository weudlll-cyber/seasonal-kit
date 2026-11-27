// @vitest-environment jsdom
/**
 * @file   src/react/useScrollTabStop.test.tsx
 * @brief  A box is a Tab stop only while it scrolls: taller content, and a style that lets it.
 *
 * Responsibility: `useScrollTabStop` gives `tabindex="0"` to a box whose content is taller than
 *                 it and whose computed `overflow-y` is `auto` or `scroll`, none to a tall box
 *                 that clips or shows its overflow, none to a box its content fits, and looks
 *                 again when the style changes. Heights are stated by the test; jsdom lays
 *                 nothing out.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useRef, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollTabStop } from './useScrollTabStop.js';

// The box is 100 px high; `data-content` says how high its content is.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {
        // Sizes do not change here.
      }
      disconnect(): void {
        // Nothing is held.
      }
    },
  );
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(100);
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function high(
    this: Element,
  ) {
    return Number(this.getAttribute('data-content') ?? 100);
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Box(p: { readonly overflowY: string; readonly content: number }): ReactElement {
  const box = useRef<HTMLDivElement>(null);
  useScrollTabStop(box);
  return (
    <div ref={box} data-testid="box" data-content={p.content} style={{ overflowY: p.overflowY }} />
  );
}

const stop = (): string | null => screen.getByTestId('box').getAttribute('tabindex');

describe('useScrollTabStop', () => {
  it.each(['auto', 'scroll'])('is a Tab stop for a tall box with overflow %s', (overflowY) => {
    render(<Box overflowY={overflowY} content={300} />);
    expect(stop()).toBe('0');
  });

  it.each(['hidden', 'visible', 'clip'])(
    'is none for a tall box with overflow %s: it does not scroll',
    (overflowY) => {
      render(<Box overflowY={overflowY} content={300} />);
      expect(stop()).toBeNull();
    },
  );

  it('is none while the content fits, and comes when the style lets the box scroll', async () => {
    const view = render(<Box overflowY="auto" content={101} />);
    expect(stop()).toBeNull();
    view.rerender(<Box overflowY="hidden" content={300} />);
    expect(stop()).toBeNull();
    view.rerender(<Box overflowY="auto" content={300} />);
    await waitFor(() => {
      expect(stop()).toBe('0');
    });
  });
});
