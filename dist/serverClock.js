export function clockOffset(samples) {
    let best = null;
    for (const { sentAt, receivedAt, serverTime } of samples) {
        const trip = receivedAt - sentAt;
        // An answer that arrived before it was sent, or a time that is no number, says nothing.
        if (![sentAt, receivedAt, serverTime].every(Number.isFinite) || trip < 0)
            continue;
        if (best === null || trip < best.trip) {
            best = { trip, offset: serverTime - (sentAt + receivedAt) / 2 };
        }
    }
    return best === null ? null : best.offset;
}
export function secondsUntil(at, now) {
    return Math.max(0, Math.ceil((at - now) / 1000));
}
