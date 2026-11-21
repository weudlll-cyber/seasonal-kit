/**
 * @file   src/server/trust.ts
 * @brief  Who may name a visitor: the website's proxy at a trusted address with the game's
 *         secret; and comparing secrets in constant time.
 *
 * Responsibility: `trustedPeers` tests the TCP peer (never a forwarding header) against the
 *                 trusted addresses and CIDR ranges, IPv4 and IPv6. An IPv4-mapped IPv6 peer
 *                 counts as its IPv4 address. Entries that are no address (Fastify's
 *                 "uniquelocal") trust nobody. `secretMatches` compares a sent value with the
 *                 expected one in constant time: both are hashed to one length first, so neither
 *                 the content nor the length leaks. An empty expected secret, or a sent value
 *                 that is missing, empty or repeated, never matches: a misconfigured install
 *                 refuses everyone instead of accepting an empty header. The same comparison
 *                 serves the CSRF token and the sync token.
 * Source:         seasonal-mini-games apps/server/src/auth/websiteIdentity.ts (`trustedPeers`) and
 *                 apps/server/src/http/routes/websiteSignIn.ts (`proxySecret`) at 866df03; the
 *                 same in seasonal-bingo-royale at a43209a. Added: the empty-secret refusal.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2 "Required trust checks"
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { BlockList, isIPv4, isIPv6 } from 'node:net';
// "::ffff:172.18.0.3" (an IPv4 peer on a dual-stack socket) → "172.18.0.3".
const plain = (address) => address.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
function familyOf(address) {
    if (isIPv4(address))
        return 'ipv4';
    return isIPv6(address) ? 'ipv6' : null;
}
export function trustedPeers(entries) {
    const list = new BlockList();
    for (const entry of entries) {
        const [address = '', bits] = entry.split('/');
        const family = familyOf(address);
        if (family === null)
            continue;
        if (bits === undefined)
            list.addAddress(address, family);
        else
            list.addSubnet(address, Number(bits), family);
    }
    return (peer) => {
        if (peer === undefined)
            return false;
        const address = plain(peer);
        const family = familyOf(address);
        return family !== null && list.check(address, family);
    };
}
const digest = (value) => createHash('sha256').update(value).digest();
export function secretMatches(expected) {
    // Hashed once; an empty secret refuses every request.
    const want = expected.length === 0 ? null : digest(expected);
    return (sent) => want !== null &&
        typeof sent === 'string' &&
        sent.length > 0 &&
        timingSafeEqual(digest(sent), want);
}
