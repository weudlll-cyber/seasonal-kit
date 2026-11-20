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
export type Fields = Readonly<Record<string, unknown>>;
export interface FrameLinkOptions<In, Out> {
    readonly frame: HTMLIFrameElement;
    readonly origin: string;
    readonly source: string;
    readonly hostSource: string;
    readonly parse: (data: Fields) => In | null;
    readonly encode: (message: Out) => Fields;
    readonly onMessage: (message: In) => void;
}
export interface FrameLink<Out> {
    readonly post: (message: Out) => void;
    readonly close: () => void;
}
export declare function checkedOrigin(origin: string): string;
export declare function linkFrame<In, Out>(options: FrameLinkOptions<In, Out>): FrameLink<Out>;
export declare const isFlag: (value: unknown) => value is boolean;
export declare const isCount: (value: unknown) => value is number;
export declare const isSize: (value: unknown) => value is number;
