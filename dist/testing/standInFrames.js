/**
 * @file   src/testing/standInFrames.ts
 * @brief  The stand-in website's chat and call frames, and the page that embeds one for a test.
 *
 * Responsibility: `/embed/chat?room=…` and `/embed/call/<id>` answer small pages that speak the
 *                 website's postMessage contract: on load they send `ready` to their parent (to its
 *                 origin only, never `*`), they act only on messages of their own host source from
 *                 that origin and window, and they keep what they received in
 *                 `window.received`. A browser test makes the frame say anything else with
 *                 `window.say(type, fields)` (an unread count, a call that ended). The messages
 *                 and their fields are `FRAME_MESSAGES`, which the contract test reads.
 * Depends on:     nothing
 * Source:         new in the kit (K74), after the games' chat stubs (seasonal-mini-games and
 *                 seasonal-cases e2e/websiteStub.ts).
 * Spec:           website docs/EMBED.md "The postMessage API" and docs/GAME-INTEGRATION.md §9 at
 *                 cc743b9
 */
export const FRAME_MESSAGES = {
    chat: {
        source: 'seasonal-chat',
        host: 'seasonal-chat-host',
        // EMBED.md "From the chat".
        ready: { type: 'ready', room: 'mini-games', signedIn: true },
        unread: { type: 'unread', room: 'mini-games', count: 3 },
        resize: { type: 'resize', height: 480 },
    },
    call: {
        source: 'seasonal-call',
        host: 'seasonal-call-host',
        // GAME-INTEGRATION.md §9 "From the view".
        ready: { type: 'ready', call: 7, status: 'live', signedIn: true },
        live: { type: 'live', listening: true },
        ended: { type: 'ended', reason: 'ended' },
        speaking: { type: 'speaking', active: true },
        resize: { type: 'resize', mode: 'picture', width: 338, height: 190 },
        error: { type: 'error', code: 'call_full' },
    },
};
// A string safe inside a <script>: JSON, with "<" written as its escape.
const literal = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
export function framePage(frame, ready) {
    const { source, host } = FRAME_MESSAGES[frame];
    return `<!doctype html><meta charset="utf-8"><title>${frame} (stand-in)</title>
<p>${frame} (stand-in)</p>
<script>
  // The parent's origin: the browser names it; Firefox gives it in the referrer.
  var parentOrigin = (location.ancestorOrigins && location.ancestorOrigins[0]) ||
    (document.referrer ? new URL(document.referrer).origin : null);
  window.received = [];
  window.say = function (type, fields) {
    if (parentOrigin) parent.postMessage(Object.assign({ source: ${literal(source)}, type: type }, fields), parentOrigin);
  };
  addEventListener('message', function (event) {
    if (event.origin !== parentOrigin || event.source !== parent) return;
    if (!event.data || event.data.source !== ${literal(host)}) return;
    window.received.push(event.data);
  });
  var ready = ${literal(ready)};
  if (parent !== window) window.say(ready.type, ready);
</script>`;
}
