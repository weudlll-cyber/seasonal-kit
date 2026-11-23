/**
 * @file   src/react/ChatDock.tsx
 * @brief  The docked chat: a strip under the game on a desktop, a bar with a sheet on a phone,
 *         and the reserved call slot beside or above it.
 *
 * Responsibility: on a desktop a full-width strip of fixed height (190 px, 150 px in a window
 *                 under 760 px high, ../../css/dock.css), always in sight, with the chat on the
 *                 left and the call slot at its right end at the strip's full height. On a phone
 *                 the bar at the bottom of the screen, in the layout: "Chat · <newest message>"
 *                 and the unread count, which opens the chat as a sheet above the bar. The sheet
 *                 takes the focus (since v0.10.0); Escape or Close shut it and hand the focus
 *                 back. In the bar's form `field` the game's
 *                 own writing field sits under it. The call slot is the 48 px strip directly
 *                 above the bar. The slot is hidden while no call id is set (../callSlot); with one
 *                 it frames the website's call view (./CallSlotBox, since v0.13.0).
 *                 Unread counts only while the chat is out of sight (../chatArrivals); the dock
 *                 provides its arrivals to the chat inside (./dockSight). A changed count is
 *                 announced in a polite live region (role status, since v0.10.1), never on the
 *                 first render. `onUnread` hands each new count to the game, for its bar's chat
 *                 button (since v0.11.0). The same element holds
 *                 the chat in both layouts, so turning a phone does not reload it. Inside a
 *                 ./DockedScreen it tells the game what "open the chat" means (./dockHandOver,
 *                 since v0.13.0).
 * Source:         seasonal-mini-games apps/web/src/match/ChatDock.tsx and chatDock.css at 866df03
 *                 (`useArrivals`, `PhoneBar`, `Body`); Bingo's chat is a side panel instead
 *                 (apps/web/src/shell/ChatDock.tsx at a43209a). Built on ../chatArrivals
 *                 (createChatArrivals, chatBarText), ./CallSlotBox and ./useDisclosure.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §5 and §9 (at e7b995c)
 */
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import { chatBarText, createChatArrivals, type ChatArrivalsState } from '../chatArrivals.js';
import { CallSlotBox } from './CallSlotBox.js';
import { DockHandOver } from './dockHandOver.js';
import { DockSight, type DockSightValue } from './dockSight.js';
import { useDisclosure, type Disclosure } from './useDisclosure.js';

export interface ChatDockProps {
  // The chat itself (the website's frame, or a game's own room).
  readonly chat: ReactNode;
  readonly phone: boolean;
  // The phone bar's form: with the game's own field under it, or the one line alone.
  readonly bar: 'field' | 'line';
  // The game's own writing field for the bar's form `field`.
  readonly field?: ReactNode;
  // The call the game's host linked, or null: the slot is hidden then.
  readonly callId: number | null;
  // Hears each new unread count, so the game's bar can show it on its chat button (since
  // v0.11.0, Cases 24): the dock's arrivals reach only the chat inside it.
  readonly onUnread?: (count: number) => void;
  // The game's configured call embed path, without the id; the website's `/embed/call` by
  // default (since v0.13.0).
  readonly callPath?: string;
}

// The arrivals while the chat is out of sight, as React state.
function useArrivals(visible: boolean): DockSightValue & { readonly state: ChatArrivalsState } {
  const [state, setState] = useState<ChatArrivalsState>({ unread: 0, newest: null });
  // One counter for the dock's life; its first visibility is the dock's first.
  const [arrivals] = useState(() => createChatArrivals(visible, setState));
  useEffect(() => {
    arrivals.setVisible(visible);
  }, [arrivals, visible]);
  return { visible, arrivals, state };
}

// What the live region says about the unread count: nothing at first, then each new count
// once it changes ("2 unread chat messages"), and nothing again once all is read. The badge
// alone is never re-read by a screen reader (audit 2026-11-22 "Noted", B7 info; v0.10.1).
function useUnreadAnnouncement(unread: number): string {
  const [said, setSaid] = useState('');
  const last = useRef(unread);
  useEffect(() => {
    if (unread === last.current) return;
    last.current = unread;
    const plural = unread === 1 ? '' : 's';
    setSaid(unread === 0 ? '' : `${String(unread)} unread chat message${plural}`);
  }, [unread]);
  return said;
}

function PhoneBar(p: {
  readonly sheet: Disclosure;
  readonly state: ChatArrivalsState;
  readonly field: ReactNode;
}): ReactElement {
  const newest = chatBarText(p.state.newest);
  return (
    <>
      <button
        ref={p.sheet.button}
        type="button"
        className="sk-chat-bar"
        aria-expanded={p.sheet.open}
        aria-controls={p.sheet.panelId}
        data-testid="chat-bar"
        onClick={p.sheet.toggle}
      >
        <span className="sk-chat-bar-newest">
          <strong>Chat</strong>
          {newest === null ? null : <span className="sk-chat-bar-last"> · {newest}</span>}
        </span>
        {p.state.unread === 0 ? null : (
          <span className="sk-chat-bar-badge" data-testid="chat-unread">
            {p.state.unread}
            <span className="sk-visually-hidden"> unread</span>
          </span>
        )}
      </button>
      {p.field}
    </>
  );
}

function Body(p: {
  readonly sheet: Disclosure;
  readonly phone: boolean;
  readonly element: RefObject<HTMLDivElement | null>;
  readonly children: ReactNode;
}): ReactElement {
  // The phone's sheet takes the focus when it opens; Close and Escape give it back to the chat
  // bar (../useDisclosure). WCAG 2.4.3, audit 2026-11-22 B7 finding 6 (DECISIONS K29). Only the
  // opening itself moves it, never a resize into the phone layout with the sheet already open
  // (v0.10.0 security pass, finding 4).
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(p.sheet.open);
  useEffect(() => {
    if (p.phone && p.sheet.open && !wasOpen.current) closeButton.current?.focus();
    wasOpen.current = p.sheet.open;
  }, [p.phone, p.sheet.open]);
  return (
    <div
      ref={p.element}
      id={p.sheet.panelId}
      className="sk-chat-dock-body"
      role={p.phone ? 'dialog' : undefined}
      aria-label={p.phone ? 'Chat' : undefined}
      hidden={p.phone && !p.sheet.open}
    >
      {p.phone ? (
        <header className="sk-chat-dock-head">
          <h2>Chat</h2>
          <button
            ref={closeButton}
            type="button"
            className="sk-chat-dock-close"
            onClick={p.sheet.close}
          >
            Close
          </button>
        </header>
      ) : null}
      {p.children}
    </div>
  );
}

// The first thing in the strip a person can type into or press: the website's frame, or a
// game's own field.
const FIRST_FOCUSABLE = 'iframe, input, textarea, select, button, a[href], [tabindex]';

// Tells a game's `useOpenDockChat` what opening the chat means here (./dockHandOver): the sheet
// on a phone (it takes the focus itself), the focus into the always visible strip on a desktop.
function useHandOver(
  phone: boolean,
  sheet: Disclosure,
  body: RefObject<HTMLDivElement | null>,
): void {
  const slot = useContext(DockHandOver);
  const { show } = sheet;
  useEffect(() => {
    if (slot === null) return undefined;
    slot.current = (): void => {
      if (phone) {
        show();
        return;
      }
      // `focus` scrolls the strip into view itself.
      body.current?.querySelector<HTMLElement>(FIRST_FOCUSABLE)?.focus();
    };
    return () => {
      slot.current = null;
    };
  }, [slot, phone, show, body]);
}

export function ChatDock(p: ChatDockProps): ReactElement {
  const sheet = useDisclosure();
  const body = useRef<HTMLDivElement>(null);
  useHandOver(p.phone, sheet, body);
  const callPath = p.callPath === undefined ? {} : { callPath: p.callPath };
  const sight = useArrivals(!p.phone || sheet.open);
  const announced = useUnreadAnnouncement(sight.state.unread);
  const { onUnread } = p;
  const unread = sight.state.unread;
  useEffect(() => {
    onUnread?.(unread);
  }, [onUnread, unread]);
  const value = useMemo(
    () => ({ visible: sight.visible, arrivals: sight.arrivals }),
    [sight.visible, sight.arrivals],
  );
  return (
    <DockSight.Provider value={value}>
      <section
        className="sk-chat-dock"
        aria-label="Chat"
        data-sk-view={p.phone ? 'phone' : 'desktop'}
        data-sk-bar={p.bar}
        data-sk-open={sheet.open}
        data-testid="chat-dock"
        onKeyDown={sheet.onKeyDown}
      >
        {/* In the page from the first render, empty, so its later changes are announced. */}
        <p
          className="sk-visually-hidden"
          role="status"
          aria-live="polite"
          data-testid="chat-announce"
        >
          {announced}
        </p>
        {p.phone ? <CallSlotBox callId={p.callId} phone {...callPath} /> : null}
        <div className="sk-chat-dock-row">
          {p.phone ? (
            <PhoneBar
              sheet={sheet}
              state={sight.state}
              field={p.bar === 'field' ? (p.field ?? null) : null}
            />
          ) : null}
          <Body sheet={sheet} phone={p.phone} element={body}>
            {p.chat}
          </Body>
          {p.phone ? null : <CallSlotBox callId={p.callId} phone={false} {...callPath} />}
        </div>
      </section>
    </DockSight.Provider>
  );
}
