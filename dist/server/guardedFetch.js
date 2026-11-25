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
 *                 - every call opens its own connection (since v0.27.0), so none rides on a
 *                   socket the check never saw;
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
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { exactOrigins } from './exactOrigins.js';
import { isPublicAddress } from './guardedAddress.js';
export class FetchRefused extends Error {
    name = 'FetchRefused';
}
// The lookup a socket uses: all the host's addresses must be public, or nothing connects.
export function publicLookup(resolver = dnsLookup) {
    return (hostname, options, callback) => {
        resolver(hostname, { ...options, all: true }, (error, addresses) => {
            // On an error the resolver gives no list at all.
            const first = error === null ? addresses[0] : undefined;
            if (error !== null) {
                callback(error, '', 4);
            }
            else if (first === undefined || !addresses.every((a) => isPublicAddress(a.address))) {
                callback(new FetchRefused('the address is not public'), '', 4);
            }
            else if (options.all === true) {
                callback(null, addresses);
            }
            else {
                callback(null, first.address, first.family);
            }
        });
    };
}
// The URL and whether it may be local, or a refusal before anything is sent.
function target(address, options, localOrigins) {
    let url;
    try {
        url = new URL(address);
    }
    catch {
        throw new FetchRefused('not an address');
    }
    const local = options.allowLocal === true || localOrigins.has(url.origin);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
        throw new FetchRefused('the address must be https');
    }
    if (options.allowedHosts !== undefined && !options.allowedHosts.includes(url.hostname)) {
        throw new FetchRefused('the host is not one this call may use');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    // A literal address never reaches the lookup, so it is judged here.
    if (!local && isIP(host) !== 0 && !isPublicAddress(host)) {
        throw new FetchRefused('the address is not public');
    }
    return { url, local };
}
function headersOf(raw) {
    const headers = new Headers();
    for (const [name, value] of Object.entries(raw)) {
        for (const one of Array.isArray(value) ? value : [value]) {
            if (one !== undefined)
                headers.append(name, one);
        }
    }
    return headers;
}
// The answer as a Response (a 204 or an empty body has no body).
function answerOf(res, chunks) {
    const status = res.statusCode ?? 0;
    const bodiless = status === 204 || status === 205 || chunks.length === 0;
    return new Response(bodiless ? null : Buffer.concat(chunks), {
        status,
        headers: headersOf(res.headers),
    });
}
// Reads the answer: a redirect and a body past `maxBytes` fail it, `done` gets the body's chunks.
function readAnswer(res, maxBytes, fail, done) {
    const chunks = [];
    const status = res.statusCode ?? 0;
    let size = 0;
    res.on('error', fail);
    if (status >= 300 && status < 400) {
        fail(new FetchRefused('a redirect is refused'));
        return;
    }
    res.on('data', (chunk) => {
        size += chunk.byteLength;
        if (size > maxBytes) {
            fail(new FetchRefused('the answer is too large'));
        }
        else {
            chunks.push(chunk);
        }
    });
    res.on('end', () => {
        done(chunks);
    });
}
export function guardedFetch(options = {}) {
    const timeoutMs = options.timeoutMs ?? 5_000;
    const maxBytes = options.maxBytes ?? 64 * 1024;
    const localOrigins = exactOrigins(options.localOrigins ?? [], 'localOrigins');
    return (address, init = {}) => new Promise((resolve, reject) => {
        const { url, local } = target(address, options, localOrigins);
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request(url, {
            method: init.method ?? 'GET',
            // A connection of its own: a pooled socket (another caller's, perhaps to a local
            // origin) would be used without the lookup that judges its address.
            agent: false,
            headers: init.headers,
            // The socket's own lookup is the guard; a local address uses the default lookup.
            ...(local ? {} : { lookup: publicLookup(options.resolver) }),
            ...(init.signal ? { signal: init.signal } : {}),
        });
        // One timer over the whole exchange, so a slow body is cut off as well as a slow start.
        const finish = () => {
            clearTimeout(timer);
        };
        // Every failure ends the request and rejects once (a later reject is ignored).
        const fail = (error) => {
            finish();
            req.destroy();
            reject(error);
        };
        const timer = setTimeout(() => {
            fail(new FetchRefused('timed out'));
        }, timeoutMs);
        req.on('error', fail);
        req.on('response', (res) => {
            readAnswer(res, maxBytes, fail, (chunks) => {
                finish();
                resolve(answerOf(res, chunks));
            });
        });
        req.end(typeof init.body === 'string' ? init.body : undefined);
    });
}
