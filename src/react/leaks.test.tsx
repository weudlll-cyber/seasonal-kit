// @vitest-environment jsdom
/**
 * @file   src/react/leaks.test.tsx
 * @brief  Every exported React part, mounted with only its required props and unmounted, leaves
 *         nothing behind: no listener on the window, the document, the visual viewport, the font
 *         set or a media query, no live observer, no timer.
 *
 * Responsibility: counts what each part adds and what it removes. A listener counts as removed
 *                 when `removeEventListener` is called with the same type and function; a
 *                 `ResizeObserver` when it is disconnected; a timer when the fake clock holds
 *                 none. Parts that add nothing pass trivially, so a part that later grows a
 *                 listener without removing it fails here. The parts are those of
 *                 `@seasonal/kit/react` that touch the browser: the components and the hooks.
 *                 Behaviour of each part is its own test file's.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit (night audit 2026-11-25, piece 3).
 */
import { cleanup, render, renderHook } from '@testing-library/react';
import { useEffect, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppHeader,
  BackLink,
  DockedScreen,
  GameBar,
  OriginChatFrame,
  PhaseStrip,
  ResultFrame,
  StartCard,
  ThemeToggle,
  WebsiteChatFrame,
  useDisclosure,
  useDockArrivals,
  useDockReserve,
  useDockSight,
  useDockView,
  useFocusMode,
  useFullscreen,
  useOpenDockChat,
  usePanels,
  useShownTheme,
  useTheme,
} from './index.js';
import { useRef } from 'react';
import { useFitScale } from './useFitScale.js';

// What is live right now, by a name that says where it was added.
const live = new Set<string>();
const ids = new WeakMap<object, number>();
let nextId = 0;
const idOf = (fn: unknown): number => {
  if (typeof fn !== 'function' && (typeof fn !== 'object' || fn === null)) return 0;
  if (!ids.has(fn)) ids.set(fn, (nextId += 1));
  return ids.get(fn) ?? 0;
};
const observers = new Set<object>();

// A visual viewport and a font set the parts can listen to; both are plain event targets.
const viewport = Object.assign(new EventTarget(), { height: 640 });
const fonts = Object.assign(new EventTarget(), { ready: new Promise<void>(() => {}) });

// Counts the listeners added to and removed from one target, by type and function.
function watch(at: string, target: EventTarget): void {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
    live.add(`${at}:${type}:${String(idOf(listener))}`);
    add(type, listener, options);
  });
  vi.spyOn(target, 'removeEventListener').mockImplementation((type, listener, options) => {
    live.delete(`${at}:${type}:${String(idOf(listener))}`);
    remove(type, listener, options);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  live.clear();
  observers.clear();
  // Each target is watched by name: jsdom's window and document do not go through the prototype.
  for (const [at, target] of [
    ['window', window],
    ['document', document],
    ['visualViewport', viewport],
    ['fonts', fonts],
  ] as const) {
    watch(at, target);
  }
  vi.stubGlobal('visualViewport', viewport);
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: (type: string, fn: unknown) =>
      live.add(`media:${query}:${type}:${String(idOf(fn))}`),
    removeEventListener: (type: string, fn: unknown) =>
      live.delete(`media:${query}:${type}:${String(idOf(fn))}`),
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor() {
        observers.add(this);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {
        observers.delete(this);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'fonts');
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
});

const base = { game: 'mini-games', signature: 'a' } as const;
const header = {
  websiteMode: true,
  brand: { href: '#/', emblem: <span />, name: 'Game' },
  links: [{ href: '#/', label: 'Play', active: true }],
  account: { name: 'Ana', role: 'host', href: '#/a', onSignOut: () => undefined },
  signIn: { href: '#/in' },
  closeKey: 'k',
} as const;

function Bar(): ReactElement {
  const panels = usePanels<'chat'>();
  return (
    <GameBar time={null} actions={[{ id: 'chat', icon: 'chat', label: 'Chat' }]} panels={panels} />
  );
}

function Fitted(): ReactElement {
  const ref = useFitScale<HTMLDivElement>('bingo', 'a', false, { afterFonts: true });
  return <div ref={ref} />;
}

function Fullscreener(): ReactElement {
  const target = useRef<HTMLDivElement>(null);
  useFullscreen(target);
  return <div ref={target} />;
}

// A phone-wide window, and a browser that can go full screen: where those parts listen at all.
function phone(): void {
  vi.stubGlobal('innerWidth', 390);
}
function supportFullscreen(): void {
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: () => Promise.resolve(),
    configurable: true,
  });
}

const components: [string, () => ReactElement][] = [
  ['AppHeader (folding)', () => <AppHeader {...header} foldBelow={960} />],
  ['AppHeader signed out', () => <AppHeader {...header} account={null} websiteMode={false} />],
  ['BackLink', () => <BackLink websiteMode />],
  ['ThemeToggle', () => <ThemeToggle />],
  ['GameBar', () => <Bar />],
  ['PhaseStrip', () => <PhaseStrip parts={[]} at={null} label="Phases" />],
  [
    'StartCard (refit after fonts)',
    () => <StartCard {...base} season={null} title="T" opensIn={3} fit={{ afterFonts: true }} />,
  ],
  ['ResultFrame (fitted)', () => <ResultFrame {...base} headline="H" placings={<ol />} fitted />],
  [
    'DockedScreen with a chat',
    () => {
      phone();
      return (
        <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
          <p>x</p>
        </DockedScreen>
      );
    },
  ],
  [
    'DockedScreen without a chat',
    () => (
      <DockedScreen withoutChat>
        <p>x</p>
      </DockedScreen>
    ),
  ],
  ['WebsiteChatFrame', () => <WebsiteChatFrame room="mini-games" />],
  ['OriginChatFrame', () => <OriginChatFrame origin="http://localhost:5380" room="mini-games" />],
  ['useFitScale', () => <Fitted />],
  [
    'useFullscreen',
    () => {
      supportFullscreen();
      return <Fullscreener />;
    },
  ],
];

const hooks: [string, () => unknown][] = [
  ['useDisclosure', () => useDisclosure()],
  ['useDockArrivals', () => useDockArrivals()],
  ['useDockReserve', () => useDockReserve()],
  ['useDockSight', () => useDockSight()],
  ['useDockView', () => useDockView()],
  [
    'useFocusMode',
    () => {
      useFocusMode();
    },
  ],
  ['useOpenDockChat', () => useOpenDockChat()],
  ['usePanels', () => usePanels()],
  ['useShownTheme', () => useShownTheme()],
  ['useTheme', () => useTheme()],
];

// The counting itself must see a leak, or a pass proves nothing.
describe('the leak counting', () => {
  it('sees a listener, an observer and a timer that stay behind', () => {
    function Leaky(): ReactElement {
      useEffect(() => {
        window.addEventListener('resize', () => undefined);
        new ResizeObserver(() => undefined);
        setInterval(() => undefined, 1000);
      }, []);
      return <p />;
    }
    render(<Leaky />).unmount();
    expect([...live].filter((entry) => entry.startsWith('window:resize'))).toHaveLength(1);
    expect(observers.size).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
  });
});

// And the parts that do listen are seen listening, so their clean pass is a real one.
describe('the counting sees the parts that listen', () => {
  it.each([
    ['DockedScreen with a chat', 'visualViewport:resize'],
    ['AppHeader (folding)', 'window:resize'],
    ['StartCard (refit after fonts)', 'fonts:loadingdone'],
    ['useFullscreen', 'document:fullscreenchange'],
  ])('%s adds %s', (name, expected) => {
    const make = components.find(([n]) => n === name)?.[1];
    render((make ?? (() => <p />))());
    expect([...live].some((entry) => entry.startsWith(expected))).toBe(true);
  });

  it('useDockReserve adds a window resize listener', () => {
    renderHook(() => useDockReserve());
    expect([...live].some((entry) => entry.startsWith('window:resize'))).toBe(true);
  });
});

describe('an exported part leaves nothing behind when it unmounts', () => {
  it.each(components)('%s', (_name, make) => {
    const { unmount } = render(make());
    unmount();
    expect([...live]).toEqual([]);
    expect(observers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(hooks)('%s', (_name, use) => {
    const { unmount } = renderHook(use);
    unmount();
    expect([...live]).toEqual([]);
    expect(observers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
