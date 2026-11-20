import { isFlag, isSize, linkFrame } from './frameMessages.js';
// The site's numeric call id.
export const isCallId = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
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
export function connectCall(options) {
    const { callId } = options;
    if (!isCallId(callId))
        throw new TypeError(`Not a call id: ${String(callId)}`);
    return linkFrame({
        frame: options.frame,
        origin: options.origin ?? window.location.origin,
        source: 'seasonal-call',
        hostSource: 'seasonal-call-host',
        parse: parseCall,
        encode: encodeCall,
        onMessage(message) {
            if (message.type === 'ready' && message.call !== callId)
                return;
            options.onMessage(message);
        },
    });
}
