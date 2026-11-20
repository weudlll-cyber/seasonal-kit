/**
 * @file   src/callView.ts
 * @brief  The website's call view inside a game, game side: its typed postMessage link
 *         (`seasonal-call` from the view, `seasonal-call-host` to it).
 *
 * Responsibility: `connectCall` links the page to the call view's frame with the chat's checks
 *                 (./frameMessages: origin, window and `source`; posts only at the view's
 *                 origin, never `'*'`). Every message type and field of GAME-INTEGRATION §9 is
 *                 checked. Anything malformed or unknown is ignored, and so is a `ready` that
 *                 names another call than the one linked. It needs a call id, so nothing links
 *                 while a game has none (./callSlot hides the slot then). It frames and loads
 *                 nothing itself: the site's `/embed/call/<id>` page is not built yet, and until
 *                 it is, a game frames nothing in the slot. Nothing the page sends is secret:
 *                 flags and a theme name.
 * Source:         new for the kit, built on the chat embed's link (./chatEmbed, from
 *                 seasonal-mini-games apps/web/src/chat/useHostChatFrame.ts at 91b23bc); no game
 *                 has a call view yet (Mini Games 91b23bc, Bingo c3b76c1).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §9 "Call view inside a game"
 *                 (at e7b995c)
 */
import type { EmbedTheme } from './chatEmbed.js';
import { isFlag, isSize, linkFrame, type Fields, type FrameLink } from './frameMessages.js';

export type CallStatus = 'scheduled' | 'live' | 'ended';

export type FromCall =
  | {
      readonly type: 'ready';
      readonly call: number;
      readonly status: CallStatus;
      readonly signedIn: boolean;
    }
  | { readonly type: 'live'; readonly listening: boolean }
  | { readonly type: 'ended'; readonly reason: 'ended' | 'gone' }
  | { readonly type: 'speaking'; readonly active: boolean }
  | {
      readonly type: 'resize';
      readonly mode: 'picture' | 'collapsed';
      readonly width: number;
      readonly height: number;
    }
  | { readonly type: 'error'; readonly code: string };

export type ToCall =
  | { readonly type: 'mute'; readonly muted: boolean }
  | { readonly type: 'collapse'; readonly collapsed: boolean }
  | { readonly type: 'theme'; readonly theme: EmbedTheme }
  | { readonly type: 'visible'; readonly visible: boolean };

// The site's numeric call id.
export const isCallId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const oneOf =
  <T extends string>(...values: readonly T[]) =>
  (value: unknown): value is T =>
    values.some((v) => v === value);

const isStatus = oneOf<CallStatus>('scheduled', 'live', 'ended');
const isReason = oneOf('ended', 'gone');
const isMode = oneOf('picture', 'collapsed');
// An error code such as `call_full`: short, lower case, never text to show as it is.
const isCode = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(value);

// One reader per message type, each checking only its own fields.
const READERS: Readonly<Record<string, (d: Fields) => FromCall | null>> = {
  ready: ({ call, status, signedIn }) =>
    isCallId(call) && isStatus(status) && isFlag(signedIn)
      ? { type: 'ready', call, status, signedIn }
      : null,
  live: ({ listening }) => (isFlag(listening) ? { type: 'live', listening } : null),
  ended: ({ reason }) => (isReason(reason) ? { type: 'ended', reason } : null),
  speaking: ({ active }) => (isFlag(active) ? { type: 'speaking', active } : null),
  resize: ({ mode, width, height }) =>
    isMode(mode) && isSize(width) && isSize(height)
      ? { type: 'resize', mode, width, height }
      : null,
  error: ({ code }) => (isCode(code) ? { type: 'error', code } : null),
};

export function parseCall(data: Fields): FromCall | null {
  const type = data.type;
  if (typeof type !== 'string' || !Object.hasOwn(READERS, type)) return null;
  return READERS[type]?.(data) ?? null;
}

// Only the fields §9 names for each message.
function encodeCall(message: ToCall): Fields {
  switch (message.type) {
    case 'mute':
      return { type: 'mute', muted: message.muted };
    case 'collapse':
      return { type: 'collapse', collapsed: message.collapsed };
    case 'theme':
      return { type: 'theme', theme: message.theme };
    case 'visible':
      return { type: 'visible', visible: message.visible };
  }
}

export interface CallLinkOptions {
  readonly frame: HTMLIFrameElement;
  // The call the game's host linked; the view's `ready` must name this one.
  readonly callId: number;
  readonly onMessage: (message: FromCall) => void;
  // The view's origin; the website's own pages are on this page's origin.
  readonly origin?: string;
}

export function connectCall(options: CallLinkOptions): FrameLink<ToCall> {
  const { callId } = options;
  if (!isCallId(callId)) throw new TypeError(`Not a call id: ${String(callId)}`);
  return linkFrame<FromCall, ToCall>({
    frame: options.frame,
    origin: options.origin ?? window.location.origin,
    source: 'seasonal-call',
    hostSource: 'seasonal-call-host',
    parse: parseCall,
    encode: encodeCall,
    onMessage(message) {
      if (message.type === 'ready' && message.call !== callId) return;
      options.onMessage(message);
    },
  });
}
