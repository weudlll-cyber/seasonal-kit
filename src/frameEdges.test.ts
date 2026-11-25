// @vitest-environment jsdom
/**
 * @file   src/frameEdges.test.ts
 * @brief  The edges of the frame messages and links that mutation testing found unguarded: each
 *         check below fails if the line it names is changed (night audit 2026-11-25, piece 3).
 *
 * Responsibility: field checks at their limits (`isCount`, `isSize`, `isCallId`); the exact words
 *                 of the errors for a bad call id, path and origin; a `type` that is a name on the
 *                 prototype (`toString`, `constructor`) is no message; each call status is taken;
 *                 a message of one type is never read as another though its fields would fit; an
 *                 array or a string is no message; a link whose frame has gone hears and posts
 *                 nothing; the chat link tells the frame its visibility on `ready` only, and a
 *                 post that is not a visibility leaves the remembered one alone.
 * Depends on:     vitest, jsdom, ../tests/frame
 */
import { afterEach, describe, expect, it } from 'vitest';

import { deliver, testFrame } from '../tests/frame.js';
import { callEmbedUrl, connectCall, isCallId, parseCall } from './callView.js';
import { chatEmbedUrl, connectChat, parseChat, type FromChat } from './chatEmbed.js';
import { checkedOrigin, isCount, isSize } from './frameMessages.js';

const closers: (() => void)[] = [];
afterEach(() => {
  closers.splice(0).forEach((close) => {
    close();
  });
  document.body.replaceChildren();
});

function chatLink(visible = true) {
  const t = testFrame();
  const heard: FromChat[] = [];
  const chat = connectChat({ frame: t.frame, visible, onMessage: (m) => heard.push(m) });
  closers.push(chat.close);
  return { ...t, chat, heard };
}

describe('the field checks at their limits', () => {
  it('isCount takes whole numbers from 0 up, and nothing else', () => {
    for (const ok of [0, 1, 412]) expect(isCount(ok)).toBe(true);
    for (const bad of [-1, 1.5, Number.NaN, Infinity, 2 ** 60, '1', null, undefined]) {
      expect(isCount(bad)).toBe(false);
    }
  });

  it('isSize takes finite numbers from 0 up, and nothing else', () => {
    for (const ok of [0, 0.5, 4000]) expect(isSize(ok)).toBe(true);
    for (const bad of [-0.1, Number.NaN, Infinity, -Infinity, '1', null, undefined]) {
      expect(isSize(bad)).toBe(false);
    }
  });

  it('isCallId takes whole numbers from 1 up, and nothing else', () => {
    for (const ok of [1, 7, 10_000]) expect(isCallId(ok)).toBe(true);
    for (const bad of [0, -1, 1.5, Number.NaN, Infinity, 2 ** 60, '7', null]) {
      expect(isCallId(bad)).toBe(false);
    }
  });
});

describe('the words of the errors', () => {
  it('name the bad call id, path and origin', () => {
    expect(() => callEmbedUrl(0, 'auto')).toThrow('Not a call id: 0');
    expect(() => callEmbedUrl(7, 'auto', '//x')).toThrow('Not a path on this site: //x');
    expect(() => chatEmbedUrl('room', 'auto', '//x')).toThrow('Not a path on this site: //x');
    const t = testFrame();
    expect(() => connectCall({ frame: t.frame, callId: 0, onMessage: () => undefined })).toThrow(
      'Not a call id: 0',
    );
    for (const origin of ['not a url', 'null', 'https://a.example/path', ' https://a.example']) {
      expect(() => checkedOrigin(origin)).toThrow(`Not a plain origin: ${origin}`);
    }
    expect(checkedOrigin('https://a.example')).toBe('https://a.example');
  });
});

describe('what a message is', () => {
  it('is no message when its type is a name on the prototype', () => {
    for (const type of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']) {
      expect(parseCall({ type })).toBeNull();
      expect(parseChat({ type })).toBeNull();
    }
  });

  it('takes each call status, and no other', () => {
    for (const status of ['scheduled', 'live', 'ended']) {
      expect(parseCall({ type: 'ready', call: 7, status, signedIn: true })).toEqual({
        type: 'ready',
        call: 7,
        status,
        signedIn: true,
      });
    }
    expect(parseCall({ type: 'ready', call: 7, status: 'over', signedIn: true })).toBeNull();
  });

  it('is never read as another type because its other fields would fit', () => {
    const fits = { room: null, signedIn: true, count: 3, height: 5 };
    expect(parseChat({ ...fits, type: 'unread' })).toEqual({
      type: 'unread',
      room: null,
      count: 3,
    });
    expect(parseChat({ ...fits, type: 'resize' })).toEqual({ type: 'resize', height: 5 });
    expect(parseChat({ ...fits, type: 'ready' })).toEqual({
      type: 'ready',
      room: null,
      signedIn: true,
    });
    expect(parseChat({ ...fits, type: 'bogus' })).toBeNull();
    expect(parseChat({ room: null, signedIn: true })).toBeNull();
    expect(parseChat({ type: 'ready', room: 5, signedIn: true })).toBeNull();
    expect(parseChat({ type: 'ready', room: null, signedIn: 'yes' })).toBeNull();
  });
});

describe('the link', () => {
  const ready = { source: 'seasonal-chat', type: 'ready', room: null, signedIn: true };

  it('takes an object only: an array, a string and null are no message', () => {
    const { win, heard } = chatLink();
    const array = Object.assign([], ready);
    for (const data of [array, 'ready', null, 7]) deliver(win, data);
    expect(heard).toEqual([]);
    deliver(win, ready);
    expect(heard).toHaveLength(1);
  });

  it('hears nothing from a window that is not its frame, nor once its frame has gone', () => {
    const { win, frame, heard, chat } = chatLink();
    deliver(window, ready);
    deliver(null, ready);
    expect(heard).toEqual([]);
    // A frame whose window is gone (jsdom keeps a removed iframe's window, so say it outright).
    Object.defineProperty(frame, 'contentWindow', { value: null });
    deliver(null, ready);
    deliver(win, ready);
    expect(heard).toEqual([]);
    // And it posts to no one without throwing.
    expect(() => {
      chat.post({ type: 'visible', visible: false });
    }).not.toThrow();
  });

  it('says the visibility on ready only, and a post that is no visibility leaves it alone', () => {
    const { win, posted, chat } = chatLink(true);
    const before = posted().length;
    deliver(win, { source: 'seasonal-chat', type: 'unread', room: null, count: 2 });
    deliver(win, { source: 'seasonal-chat', type: 'resize', height: 9 });
    expect(posted()).toHaveLength(before);
    chat.post({ type: 'theme', theme: 'dark' });
    deliver(win, ready);
    const last = posted().at(-1)?.[0] as { type: string; visible?: boolean };
    expect(last).toMatchObject({ type: 'visible', visible: true });
    chat.post({ type: 'visible', visible: false });
    deliver(win, ready);
    expect((posted().at(-1)?.[0] as { visible?: boolean }).visible).toBe(false);
  });
});
