/**
 * @file   src/server/guardedFetch.ts
 * @brief  A fetch that cannot be turned against the server's own network: https only, public
 *         addresses only, no redirects, a timeout and a size limit.
 *
 * Responsibility: `guardedFetch(options)` returns a function with the shape of `fetch`
 *                 (`(url, init) => Promise<Response>`), so it is what `seasonFeedReader` takes as
 *                 its `fetch`, and what a game's webhook or feed read uses:
 *                 - the address must be https, and (with `allowedHosts`) one of the named hosts;
 *                 - every address the host resolves to must be public (`isPublicAddress`), and
 *                   the check runs inside the socket's own lookup, on the answer the connection
 *                   then uses, so a name that answers differently a second time (DNS rebinding)
 *                   cannot slip past; an address literal is checked before any connection;
 *                 - a redirect is refused, never followed;
 *                 - the whole exchange, body included, ends within `timeoutMs` (5 s), and an
 *                   answer larger than `maxBytes` (64 KiB) is cut off and refused as it arrives;
 *                 - the answer is a `Response` with the status and headers, so `response.ok`
 *                   and `response.json()` work; the caller's `init.signal` also aborts it.
 *                 `localOrigins` (since v0.27.0) names exact origins from the game's server
 *                 configuration, never from a user's or an admin's input, that may be reached
 *                 over plain http and at a private or container address; every other rule holds
 *                 for them too (`allowedHosts`, no redirect, the time and the size), and every
 *                 other address is judged as without the option. `allowLocal` (development and
 *                 tests only) allows plain http and private addresses for all. Nothing here logs; a refusal is a `FetchRefused` whose message
 *                 names the rule, never the address or a header.
 * Depends on:     node:http, node:https, node:dns, node:net, ./guardedAddress, ./exactOrigins
 * Source:         seasonal-mini-games apps/server/src/seasons/safeFetch.ts (`readLimited`, the
 *                 https and redirect rules, 5 s and 64 KiB) and
 *                 apps/server/src/integration/safePost.ts (the checked lookup) at 9e3c6f3.
 *                 Generalised: one function for GET and POST, the allowed hosts as an option,
 *                 the limits as options, the answer as a `Response`. Left in the games: what
 *                 they do with an answer (the feed's JSON, the webhook's status).
 * Spec:           docs/concepts/shared-server-parts.md §2
 */
import { lookup as dnsLookup } from 'node:dns';
import { type LookupFunction } from 'node:net';
export declare class FetchRefused extends Error {
    name: string;
}
export interface GuardedFetchOptions {
    readonly allowedHosts?: readonly string[];
    readonly timeoutMs?: number;
    readonly maxBytes?: number;
    readonly localOrigins?: readonly string[];
    readonly allowLocal?: boolean;
    readonly resolver?: typeof dnsLookup;
}
type Resolver = typeof dnsLookup;
export declare function publicLookup(resolver?: Resolver): LookupFunction;
export declare function guardedFetch(options?: GuardedFetchOptions): (url: string, init?: RequestInit) => Promise<Response>;
export {};
