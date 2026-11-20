// @vitest-environment jsdom
/**
 * @file   src/chatEmbed.test.ts
 * @brief  The chat embed, game side: its address, and a link that hears only the chat's frame
 *         at the chat's origin and tells it only what EMBED.md names.
 *
 * Responsibility: the address is relative, room and theme encoded, and never another host. The
 *                 link takes `ready`, `unread` and `resize` with their fields and drops extra
 *                 ones. It ignores a wrong origin, another window, another `source`, data that
 *                 is no object, and malformed or unknown messages. It posts only at the chat's
 *                 origin, says the visibility on connect, on change and again on each `ready`,
 *                 and falls silent once closed. These are the checks of Mini Games'
 *                 useHostChatFrame (91b23bc), without React, plus every field EMBED.md names.
 * Depends on:     vitest, jsdom, ../tests/frame
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deliver, testFrame } from '../tests/frame.js';
import { chatEmbedUrl, connectChat, parseChat, type FromChat } from './chatEmbed.js';
import { checkedOrigin } from './frameMessages.js';

const ORIGIN = window.location.origin;
const closers: (() => void)[] = [];

function link(visible = true) {
  const t = testFrame();
  const heard: FromChat[] = [];
  const chat = connectChat({ frame: t.frame, visible, onMessage: (m) => heard.push(m) });
  closers.push(chat.close);
  return { ...t, chat, heard };
}

afterEach(() => {
  closers.splice(0).forEach((close) => {
    close();
  });
  document.body.replaceChildren();
});

describe('chatEmbedUrl', () => {
  it('is the website embed page on this site, with room and theme', () => {
    expect(chatEmbedUrl('mini-games', 'dark')).toBe('/embed/chat?room=mini-games&theme=dark');
    expect(chatEmbedUrl('bingo', 'auto', '/site/embed/chat')).toBe(
      '/site/embed/chat?room=bingo&theme=auto',
    );
  });

  it('encodes the room', () => {
    expect(chatEmbedUrl('a b&theme=x', 'light')).toBe(
      '/embed/chat?room=a+b%26theme%3Dx&theme=light',
    );
  });

  it.each(['https://evil.example/embed/chat', '//evil.example/embed/chat', '/\\evil', 'embed'])(
    'refuses %s as the path',
    (path) => {
      expect(() => chatEmbedUrl('bingo', 'light', path)).toThrow(TypeError);
    },
  );
});

describe('the chat link: what it hears', () => {
  it('takes ready, unread and resize with their fields only', () => {
    const { win, heard } = link();
    deliver(win, { source: 'seasonal-chat', type: 'ready', room: 'bingo', signedIn: true });
    deliver(win, { source: 'seasonal-chat', type: 'unread', room: null, count: 3, text: 'x' });
    deliver(win, { source: 'seasonal-chat', type: 'resize', height: 412 });
    expect(heard).toEqual([
      { type: 'ready', room: 'bingo', signedIn: true },
      { type: 'unread', room: null, count: 3 },
      { type: 'resize', height: 412 },
    ]);
  });

  it('ignores another origin, another window and another source', () => {
    const { win, heard } = link();
    const good = { source: 'seasonal-chat', type: 'unread', room: 'bingo', count: 1 };
    deliver(win, good, 'https://evil.example');
    deliver(window, good);
    deliver(null, good);
    deliver(win, { ...good, source: 'seasonal-call' });
    deliver(win, { ...good, source: undefined });
    expect(heard).toEqual([]);
  });

  it.each([
    ['a string', 'ready'],
    ['null', null],
    ['an array', ['seasonal-chat', 'ready']],
  ])('ignores data that is %s', (_what, data) => {
    const { win, heard } = link();
    deliver(win, data);
    expect(heard).toEqual([]);
  });
});

describe('the chat link: what it drops', () => {
  it.each([
    { type: 'unread', room: 'bingo', count: -1 },
    { type: 'unread', room: 'bingo', count: 1.5 },
    { type: 'unread', room: 'bingo', count: '3' },
    { type: 'unread', room: 7, count: 3 },
    { type: 'unread', count: 3 },
    { type: 'ready', room: 'bingo', signedIn: 'yes' },
    { type: 'ready', room: 'bingo' },
    { type: 'resize', height: -4 },
    { type: 'resize', height: Number.POSITIVE_INFINITY },
    { type: 'visible', visible: true },
    { type: 'login', token: 'secret' },
    {},
  ])('ignores the malformed or unknown %j', (fields) => {
    const { win, heard } = link();
    deliver(win, { source: 'seasonal-chat', ...fields });
    expect(heard).toEqual([]);
    expect(parseChat(fields)).toBeNull();
  });

  it('hears nothing once closed', () => {
    const { win, heard, chat } = link();
    chat.close();
    deliver(win, { source: 'seasonal-chat', type: 'resize', height: 1 });
    expect(heard).toEqual([]);
  });
});

describe('the chat link: what it says', () => {
  it('says the visibility on connect, only at the chat origin', () => {
    const { posted } = link(false);
    expect(posted()).toEqual([
      [{ type: 'visible', visible: false, source: 'seasonal-chat-host' }, ORIGIN],
    ]);
  });

  it('says the current visibility again on every ready', () => {
    const { win, chat, posted } = link(true);
    chat.post({ type: 'visible', visible: false });
    deliver(win, { source: 'seasonal-chat', type: 'ready', room: 'bingo', signedIn: false });
    expect(posted().map(([m]) => m)).toEqual([
      { type: 'visible', visible: true, source: 'seasonal-chat-host' },
      { type: 'visible', visible: false, source: 'seasonal-chat-host' },
      { type: 'visible', visible: false, source: 'seasonal-chat-host' },
    ]);
  });

  it('sends the theme with nothing else, even when given more', () => {
    const { chat, posted } = link();
    const extra = { type: 'theme', theme: 'dark', token: 'secret' } as const;
    chat.post(extra);
    expect(posted().at(-1)).toEqual([
      { type: 'theme', theme: 'dark', source: 'seasonal-chat-host' },
      ORIGIN,
    ]);
  });
});

describe('the chat link: when it is silent, and its origin', () => {
  it('posts nothing once closed, and nothing to a frame without a window', () => {
    const { chat, posted, frame } = link();
    chat.close();
    chat.post({ type: 'visible', visible: false });
    expect(posted()).toHaveLength(1);
    frame.remove();
    const detached = connectChat({ frame, visible: true, onMessage: vi.fn() });
    expect(() => {
      detached.post({ type: 'theme', theme: 'auto' });
    }).not.toThrow();
    detached.close();
  });

  it('uses an origin it is given, and refuses one that is no plain origin', () => {
    const { frame, posted } = testFrame();
    const other = connectChat({
      frame,
      visible: true,
      origin: 'https://seasonal.example',
      onMessage: vi.fn(),
    });
    closers.push(other.close);
    expect(posted()[0]?.[1]).toBe('https://seasonal.example');
    for (const origin of [
      '*',
      'null',
      'https://seasonal.example/',
      'https://x.example/chat',
      'x',
    ]) {
      expect(() => checkedOrigin(origin)).toThrow(TypeError);
    }
  });
});
