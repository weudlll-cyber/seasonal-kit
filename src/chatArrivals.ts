/**
 * @file   src/chatArrivals.ts
 * @brief  What the docked chat strip and the phone chat bar show while the chat is out of
 *         sight: the unread count and the newest message.
 *
 * Responsibility: `createChatArrivals` keeps both and calls `changed` after each change.
 *                 Unread counts another player's live message (`arrived`) only while the chat
 *                 is out of sight; showing it sets the count back to 0. A message that counts
 *                 for nothing (one's own, a system line, the history loaded on joining:
 *                 `latest`) only becomes the newest. A host's chat frame counts for itself and
 *                 hands its count over (`frameUnread`, from the embed's `unread`, ./chatEmbed).
 *                 The frame never sends message text, so with the embed the newest stays null.
 *                 `chatBarText` is the bar's words after "Chat": "author: text", or a system
 *                 line's text alone. A deleted message (text null) shows nothing.
 * Source:         seasonal-mini-games apps/web/src/chat/chatArrivals.ts and
 *                 apps/web/src/match/ChatDock.tsx (`useArrivals`, `barText`) at 91b23bc, out of
 *                 React's contexts and state; Bingo has no equivalent (c3b76c1).
 * Spec:           Seasonal Entertainment docs/EMBED.md "The postMessage API" (`unread`)
 */

// A message that arrived: its author's name (null for a system line) and its text (null once
// a moderator deleted it).
export interface ChatArrival {
  readonly author: string | null;
  readonly text: string | null;
}

export interface ChatArrivalsState {
  readonly unread: number;
  readonly newest: ChatArrival | null;
}

export interface ChatArrivals {
  readonly state: () => ChatArrivalsState;
  // Another player's live message.
  readonly arrived: (message: ChatArrival) => void;
  // A message that counts for nothing but is the newest now.
  readonly latest: (message: ChatArrival) => void;
  // The chat frame's own unread count.
  readonly frameUnread: (count: number) => void;
  // The chat came into sight (unread back to 0) or went out of it.
  readonly setVisible: (visible: boolean) => void;
}

export function chatBarText(message: ChatArrival | null): string | null {
  if (message === null || message.text === null) return null;
  return message.author === null ? message.text : `${message.author}: ${message.text}`;
}

export function createChatArrivals(
  visible: boolean,
  changed: (state: ChatArrivalsState) => void,
): ChatArrivals {
  let shown = visible;
  let state: ChatArrivalsState = { unread: 0, newest: null };
  const set = (next: Partial<ChatArrivalsState>): void => {
    state = { ...state, ...next };
    changed(state);
  };
  return {
    state: () => state,
    arrived(message) {
      set({ newest: message, unread: shown ? state.unread : state.unread + 1 });
    },
    latest(message) {
      set({ newest: message });
    },
    frameUnread(count) {
      set({ unread: count });
    },
    setVisible(next) {
      shown = next;
      if (next) set({ unread: 0 });
    },
  };
}
