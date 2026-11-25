/**
 * @file   src/server/guardedAddress.ts
 * @brief  Which addresses a guarded request may connect to: public ones only.
 *
 * Responsibility: `isPublicAddress` says whether an IP address (IPv4 or IPv6, as text) is one a
 *                 server may call out to. It refuses loopback, private, link-local,
 *                 carrier-grade NAT, multicast, unspecified, reserved and benchmarking IPv4
 *                 ranges, the IPv6 unspecified, loopback, unique-local, link-local, multicast,
 *                 documentation, 6to4 and NAT64 ranges, and an IPv4-mapped IPv6 address (in the
 *                 dotted or the hex form the URL parser produces) is judged as its IPv4 address.
 *                 Text that is no address, or carries a zone id, is not public. It never throws.
 * Depends on:     node:net
 * Source:         seasonal-mini-games apps/server/src/seasons/safeFetch.ts (`isPublicAddress`
 *                 and its ranges) at 9e3c6f3. Added: the hex form of an IPv4-mapped address
 *                 (`new URL('https://[::ffff:127.0.0.1]').hostname` is `[::ffff:7f00:1]`, which
 *                 Mini Games' dotted-only match does not see), the reserved, benchmarking,
 *                 documentation, 6to4 and NAT64 ranges, and the refusal of a zone id.
 * Spec:           docs/concepts/shared-server-parts.md §2
 */
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this network", the unspecified address
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (cloud metadata lives here)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, and the broadcast address
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64: carries an IPv4 address
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4: carries an IPv4 address
  ['fc00::', 7], // unique-local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6');
}

// The IPv4 address inside an IPv4-mapped IPv6 one, or null. The address is first written the
// way the URL parser writes it (compressed, lower case), so every spelling is one form.
function mappedV4(address: string): string | null {
  let canonical: string;
  try {
    canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (hex?.[1] === undefined || hex[2] === undefined) return null;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return `${String(high >> 8)}.${String(high & 255)}.${String(low >> 8)}.${String(low & 255)}`;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  // A zone id ("fe80::1%eth0") names an interface, so it is never a public address.
  if (family === 0 || address.includes('%')) return false;
  if (family === 6) {
    const mapped = mappedV4(address);
    if (mapped !== null) return isPublicAddress(mapped);
  }
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}
