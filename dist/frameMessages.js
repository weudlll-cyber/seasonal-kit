/**
 * @file   src/frameMessages.ts
 * @brief  The host page's side of a postMessage link to one website frame (the chat embed, the
 *         call view): checked on the way in, explicit on the way out.
 *
 * Responsibility: one listener per link, which hands on a message only when all four checks
 *                 pass: `event.origin` is the frame's origin, `event.source` is that frame's
 *                 own window, the data is a plain object, and its `source` is the frame's
 *                 (`seasonal-chat`, `seasonal-call`). Anything else is ignored without a trace.
 *                 The message's own fields are then checked by the caller's `parse`, which
 *                 returns null for anything malformed. Outgoing messages go only to that frame,
 *                 only at that origin (never `'*'`), and carry only the fields that `encode`
 *                 names, so nothing else from the page can ride along. The origin is checked
 *                 when the link is made: an origin that is no plain `scheme://host[:port]`
 *                 throws, so a typo cannot widen the check.
 * Source:         seasonal-mini-games apps/web/src/chat/useHostChatFrame.ts at 91b23bc (the
 *                 checks and the post, taken out of its React hook and made generic for the call
 *                 view).
 * Spec:           Seasonal Entertainment docs/EMBED.md "The postMessage API";
 *                 docs/GAME-INTEGRATION.md §5 and §9 (at e7b995c)
 */
const isFields = (data) => typeof data === 'object' && data !== null && !Array.isArray(data);
// A plain origin, as `URL.origin` writes it; anything else (a path, '*', 'null') throws.
export function checkedOrigin(origin) {
    let parsed;
    try {
        parsed = new URL(origin).origin;
    }
    catch {
        parsed = 'null';
    }
    if (parsed === 'null' || parsed !== origin) {
        throw new TypeError(`Not a plain origin: ${origin}`);
    }
    return origin;
}
export function linkFrame(options) {
    const { frame, source, hostSource, parse, encode, onMessage } = options;
    const origin = checkedOrigin(options.origin);
    let open = true;
    const listen = (event) => {
        const own = frame.contentWindow;
        if (own === null || event.source !== own || event.origin !== origin)
            return;
        const data = event.data;
        if (!isFields(data) || data.source !== source)
            return;
        const message = parse(data);
        if (message !== null)
            onMessage(message);
    };
    window.addEventListener('message', listen);
    return {
        post(message) {
            if (!open)
                return;
            frame.contentWindow?.postMessage({ ...encode(message), source: hostSource }, origin);
        },
        close() {
            open = false;
            window.removeEventListener('message', listen);
        },
    };
}
// The field checks both frames' messages share.
export const isFlag = (value) => typeof value === 'boolean';
export const isCount = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const isSize = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
