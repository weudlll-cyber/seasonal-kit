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
export declare const FRAME_MESSAGES: {
    readonly chat: {
        readonly source: "seasonal-chat";
        readonly host: "seasonal-chat-host";
        readonly ready: {
            readonly type: "ready";
            readonly room: "mini-games";
            readonly signedIn: true;
        };
        readonly unread: {
            readonly type: "unread";
            readonly room: "mini-games";
            readonly count: 3;
        };
        readonly resize: {
            readonly type: "resize";
            readonly height: 480;
        };
    };
    readonly call: {
        readonly source: "seasonal-call";
        readonly host: "seasonal-call-host";
        readonly ready: {
            readonly type: "ready";
            readonly call: 7;
            readonly status: "live";
            readonly signedIn: true;
        };
        readonly live: {
            readonly type: "live";
            readonly listening: true;
        };
        readonly ended: {
            readonly type: "ended";
            readonly reason: "ended";
        };
        readonly speaking: {
            readonly type: "speaking";
            readonly active: true;
        };
        readonly resize: {
            readonly type: "resize";
            readonly mode: "picture";
            readonly width: 338;
            readonly height: 190;
        };
        readonly error: {
            readonly type: "error";
            readonly code: "call_full";
        };
    };
};
type Frame = keyof typeof FRAME_MESSAGES;
export declare function framePage(frame: Frame, ready: Readonly<Record<string, unknown>>): string;
export {};
