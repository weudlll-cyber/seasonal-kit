/**
 * @file   tests/frame.ts
 * @brief  Test helper: a real iframe in jsdom, whose posts are recorded, and messages "from" any
 *         window at any origin.
 *
 * Responsibility: the chat and call link tests (src/chatEmbed.test.ts, src/callView.test.ts)
 *                 drive the page's listener exactly as a browser would: a `message` event on
 *                 the page's window with `data`, `origin` and `source`. The frame's
 *                 `postMessage` is replaced by a recorder, so a test reads what the page sent
 *                 and to which origin.
 */
import { vi } from 'vitest';

export interface TestFrame {
  readonly frame: HTMLIFrameElement;
  readonly win: Window;
  // Each post as [message, targetOrigin].
  readonly posted: () => unknown[][];
}

export function testFrame(): TestFrame {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const win = frame.contentWindow;
  if (win === null) throw new Error('jsdom gave the iframe no window');
  const post = vi.spyOn(win, 'postMessage').mockImplementation(() => undefined);
  return { frame, win, posted: () => post.mock.calls };
}

// A message event on the page's window, as the browser delivers one from `source`.
export function deliver(
  source: Window | null,
  data: unknown,
  origin = window.location.origin,
): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
}
