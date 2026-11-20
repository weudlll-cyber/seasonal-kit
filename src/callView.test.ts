// @vitest-environment jsdom
/**
 * @file   src/callView.test.ts
 * @brief  The call view's link: it hears only the view's frame at its origin, only the
 *         messages §9 names, and only for the linked call; it tells the view only §9's fields.
 *
 * Responsibility: every message from the view parses with its fields. Malformed fields, unknown
 *                 types, the chat's `source`, another origin or window, and a `ready` for
 *                 another call are ignored. No link without a valid call id. Each message to the
 *                 view carries only its own fields, at the view's origin.
 * Depends on:     vitest, jsdom, ../tests/frame
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deliver, testFrame } from '../tests/frame.js';
import { connectCall, parseCall, type FromCall, type ToCall } from './callView.js';

const ORIGIN = window.location.origin;
const closers: (() => void)[] = [];

function link(callId = 42) {
  const t = testFrame();
  const heard: FromCall[] = [];
  const call = connectCall({ frame: t.frame, callId, onMessage: (m) => heard.push(m) });
  closers.push(call.close);
  return { ...t, call, heard };
}

afterEach(() => {
  closers.splice(0).forEach((close) => {
    close();
  });
  document.body.replaceChildren();
});

const VALID: FromCall[] = [
  { type: 'ready', call: 42, status: 'live', signedIn: false },
  { type: 'ready', call: 42, status: 'scheduled', signedIn: true },
  { type: 'live', listening: true },
  { type: 'ended', reason: 'gone' },
  { type: 'speaking', active: false },
  { type: 'resize', mode: 'collapsed', width: 48, height: 190 },
  { type: 'error', code: 'call_full' },
];

describe('the call link: what it hears', () => {
  it.each(VALID)('takes %j', (message) => {
    const { win, heard } = link();
    deliver(win, { source: 'seasonal-call', ...message, name: 'Ana' });
    expect(heard).toEqual([message]);
  });

  it.each([
    { type: 'ready', call: '42', status: 'live', signedIn: true },
    { type: 'ready', call: 0, status: 'live', signedIn: true },
    { type: 'ready', call: 42, status: 'over', signedIn: true },
    { type: 'ready', call: 42, status: 'live' },
    { type: 'live', listening: 1 },
    { type: 'ended', reason: 'kicked' },
    { type: 'speaking' },
    { type: 'resize', mode: 'pip', width: 1, height: 1 },
    { type: 'resize', mode: 'picture', width: -1, height: 1 },
    { type: 'resize', mode: 'picture', width: 1 },
    { type: 'error', code: '<b>full</b>' },
    { type: 'error', code: 'x'.repeat(65) },
    { type: 'error' },
    { type: 'toString' },
    { type: 'mute', muted: true },
    { type: 7 },
    {},
  ])('ignores the malformed or unknown %j', (fields) => {
    const { win, heard } = link();
    deliver(win, { source: 'seasonal-call', ...fields });
    expect(heard).toEqual([]);
    expect(parseCall(fields)).toBeNull();
  });

  it('ignores a ready for another call', () => {
    const { win, heard } = link(42);
    deliver(win, {
      source: 'seasonal-call',
      type: 'ready',
      call: 43,
      status: 'live',
      signedIn: true,
    });
    expect(heard).toEqual([]);
  });

  it('ignores the chat’s source, another origin and another window', () => {
    const { win, heard } = link();
    const good = { source: 'seasonal-call', type: 'live', listening: true };
    deliver(win, { ...good, source: 'seasonal-chat' });
    deliver(win, good, 'https://evil.example');
    deliver(window, good);
    expect(heard).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN])('links nothing for the call id %s', (callId) => {
    const { frame } = testFrame();
    expect(() => connectCall({ frame, callId, onMessage: vi.fn() })).toThrow(TypeError);
  });
});

describe('the call link: what it says', () => {
  it.each<[ToCall, object]>([
    [
      { type: 'mute', muted: true },
      { type: 'mute', muted: true },
    ],
    [
      { type: 'collapse', collapsed: false },
      { type: 'collapse', collapsed: false },
    ],
    [
      { type: 'theme', theme: 'light' },
      { type: 'theme', theme: 'light' },
    ],
    [
      { type: 'visible', visible: false },
      { type: 'visible', visible: false },
    ],
  ])('sends %j with its own fields only, at the view origin', (message, fields) => {
    const { call, posted } = link();
    // A caller's object with more on it than the type names (a variable, so TS allows it).
    const more: ToCall = Object.assign({ token: 'secret' }, message);
    call.post(more);
    expect(posted()).toEqual([[{ ...fields, source: 'seasonal-call-host' }, ORIGIN]]);
  });

  it('says nothing on connect and nothing once closed', () => {
    const { call, posted } = link();
    expect(posted()).toEqual([]);
    call.close();
    call.post({ type: 'mute', muted: true });
    expect(posted()).toEqual([]);
  });
});
