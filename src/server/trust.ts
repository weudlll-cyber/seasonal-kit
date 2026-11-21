/**
 * @file   src/server/trust.ts
 * @brief  Who may name a visitor: the website's proxy at a trusted address with the game's
 *         secret; and comparing secrets in constant time.
 *
 * Responsibility: `trustedPeers` tests the TCP peer (never a forwarding header) against the
 *                 trusted addresses and CIDR ranges, IPv4 and IPv6. An IPv4-mapped IPv6 peer
 *                 counts as its IPv4 address. Entries that are no address (Fastify's
 *                 "uniquelocal") trust nobody; an address with a prefix that is not 0–32 (IPv4)
 *                 or 0–128 (IPv6) digits throws, since a blank one would trust everyone.
 *                 `secretMatches` compares a sent value with the
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
const plain = (address: string): string => address.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');

function familyOf(address: string): 'ipv4' | 'ipv6' | null {
  if (isIPv4(address)) return 'ipv4';
  return isIPv6(address) ? 'ipv6' : null;
}

// A CIDR prefix: 1 to 3 digits, at most 32 (IPv4) or 128 (IPv6). "" or " " would read as 0 and
// trust every peer, so anything else throws when the list is made (v0.8.0 pass, review 1, finding
// 1).
function prefixOf(bits: string, family: 'ipv4' | 'ipv6', entry: string): number {
  const max = family === 'ipv4' ? 32 : 128;
  if (!/^\d{1,3}$/.test(bits) || Number(bits) > max) {
    throw new RangeError(`Not a trusted proxy range: ${entry}`);
  }
  return Number(bits);
}

export function trustedPeers(entries: readonly string[]): (peer: string | undefined) => boolean {
  const list = new BlockList();
  for (const entry of entries) {
    const [address = '', bits, ...rest] = entry.split('/');
    const family = familyOf(address);
    // A keyword such as Fastify's "uniquelocal" is no address: it trusts nobody here.
    if (family === null) continue;
    if (rest.length > 0) throw new RangeError(`Not a trusted proxy range: ${entry}`);
    if (bits === undefined) list.addAddress(address, family);
    else list.addSubnet(address, prefixOf(bits, family, entry), family);
  }
  return (peer) => {
    if (peer === undefined) return false;
    const address = plain(peer);
    const family = familyOf(address);
    return family !== null && list.check(address, family);
  };
}

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

// A header value as Node gives it: a string, a repeated header's list, or nothing.
export type HeaderValue = string | readonly string[] | undefined;

export function secretMatches(expected: string): (sent: HeaderValue) => boolean {
  // Hashed once; an empty secret refuses every request.
  const want = expected.length === 0 ? null : digest(expected);
  return (sent) =>
    want !== null &&
    typeof sent === 'string' &&
    sent.length > 0 &&
    timingSafeEqual(digest(sent), want);
}
