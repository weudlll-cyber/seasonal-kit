import { isLocalPath } from './localPath.js';
import { isFlag, isSize, linkFrame } from './frameMessages.js';
// The site's numeric call id.
export const isCallId = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const EMBED_PATH = '/embed/call';
const themed = (path, call, theme) => {
    if (!isLocalPath(path))
        throw new TypeError(`Not a path on this site: ${path}`);
    return `${path.replace(/\/$/, '')}/${call}?${new URLSearchParams({ theme }).toString()}`;
};
// "/embed/call/shared?theme=dark": the view of whichever call is shared with the games now.
export function sharedCallEmbedUrl(theme, path = EMBED_PATH) {
    return themed(path, 'shared', theme);
}
// "/embed/call/7?theme=dark"; `path` is the game's configured embed path (without the id).
export function callEmbedUrl(callId, theme, path = EMBED_PATH) {
    if (!isCallId(callId))
        throw new TypeError(`Not a call id: ${String(callId)}`);
    return themed(path, String(callId), theme);
}
const oneOf = (...values) => (value) => values.some((v) => v === value);
const isStatus = oneOf('scheduled', 'live', 'ended');
const isReason = oneOf('ended', 'gone');
const isMode = oneOf('picture', 'collapsed');
// An error code such as `call_full`: short, lower case, never text to show as it is.
const isCode = (value) => typeof value === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(value);
// One reader per message type, each checking only its own fields.
const READERS = {
    ready: ({ call, status, signedIn }) => isCallId(call) && isStatus(status) && isFlag(signedIn)
        ? { type: 'ready', call, status, signedIn }
        : null,
    live: ({ listening }) => (isFlag(listening) ? { type: 'live', listening } : null),
    ended: ({ reason }) => (isReason(reason) ? { type: 'ended', reason } : null),
    speaking: ({ active }) => (isFlag(active) ? { type: 'speaking', active } : null),
    resize: ({ mode, width, height }) => isMode(mode) && isSize(width) && isSize(height)
        ? { type: 'resize', mode, width, height }
        : null,
    error: ({ code }) => (isCode(code) ? { type: 'error', code } : null),
};
export function parseCall(data) {
    const type = data.type;
    if (typeof type !== 'string' || !Object.hasOwn(READERS, type))
        return null;
    return READERS[type]?.(data) ?? null;
}
// Only the fields §9 names for each message.
function encodeCall(message) {
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
// One link to a call view; `ours` drops the messages of a view that is not the one asked for.
function connectView(options, ours) {
    return linkFrame({
        frame: options.frame,
        origin: options.origin ?? window.location.origin,
        source: 'seasonal-call',
        hostSource: 'seasonal-call-host',
        parse: parseCall,
        encode: encodeCall,
        onMessage(message) {
            if (ours(message))
                options.onMessage(message);
        },
    });
}
export function connectCall(options) {
    const { callId } = options;
    if (!isCallId(callId))
        throw new TypeError(`Not a call id: ${String(callId)}`);
    return connectView(options, (m) => m.type !== 'ready' || m.call === callId);
}
// The view of the one call shared with the games: its `ready` names whichever call that is.
export function connectSharedCall(options) {
    return connectView(options, () => true);
}
