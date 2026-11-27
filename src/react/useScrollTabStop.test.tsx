// @vitest-environment jsdom
/**
 * @file   src/react/useScrollTabStop.test.tsx
 * @brief  A box is a Tab stop only while it scrolls: taller content, and a style that lets it.
 *
 * Responsibility: `useScrollTabStop` gives `tabindex="0"` to a box whose content is taller than
 *                 it and whose computed `overflow-y` is `auto` or `scroll`, none to a tall box
 *                 that clips or shows its overflow, none to a box its content fits, and looks
 *                 again when the style changes. Used as a ref callback (without a ref) it watches
 *                 a box rendered later and lets it go when it leaves. Heights are stated by the
 *                 test; jsdom lays nothing out.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useRef, type CSSProperties, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollTabStop } from './useScrollTabStop.js';

const observers = { made: 0, dropped: 0 };

// The box is 100 px high; `data-content` says how high its content is.
beforeEach(() => {
  Object.assign(observers, { made: 0, dropped: 0 });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {
        observers.made += 1;
      }
      disconnect(): void {
        observers.dropped += 1;
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
    <div
      ref={box}
      data-testid="box"
      data-content={p.content}
      style={{ overflowY: p.overflowY as CSSProperties['overflowY'] }}
    />
  );
}

const stop = (): string | null => screen.getByTestId('box').getAttribute('tabindex');

// A component whose box comes later, as a list that is rendered once its data is there.
function Late(p: { readonly shown: boolean; readonly content: number }): ReactElement {
  const box = useScrollTabStop();
  return p.shown ? (
    <div ref={box} data-testid="box" data-content={p.content} style={{ overflowY: 'auto' }} />
  ) : (
    <p>waiting</p>
  );
}

// Every observer a test's boxes made and let go of.
const watching = (): number => observers.made - observers.dropped;

describe('useScrollTabStop as a ref callback', () => {
  it('watches a box that is rendered after the component', () => {
    const view = render(<Late shown={false} content={300} />);
    view.rerender(<Late shown content={300} />);
    expect(stop()).toBe('0');
  });

  it('stops watching when the box goes, and watches the next one', () => {
    const view = render(<Late shown content={300} />);
    expect(watching()).toBe(1);
    view.rerender(<Late shown={false} content={300} />);
    expect(watching()).toBe(0);
    view.rerender(<Late shown content={100} />);
    expect([watching(), stop()]).toEqual([1, null]);
    view.unmount();
    expect(watching()).toBe(0);
  });
});

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
