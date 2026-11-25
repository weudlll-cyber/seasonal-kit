/**
 * @file   src/server/guardedFetch.test.ts
 * @brief  The guarded fetch refuses what it must, before and while it connects (v0.21.0).
 *
 * Responsibility: against a real local server (`allowLocal`, plain http) the exchange itself:
 *                 the answer's status, headers and body, a POST body, a redirect refused and
 *                 never followed, an oversize body cut off, a slow body timed out, the caller's
 *                 abort. With `allowLocal` off and a stub resolver: a name that resolves to a
 *                 private address, or to one private among public ones, is refused by the
 *                 socket's lookup and the server sees no connection; a second, different answer
 *                 is judged afresh (DNS rebinding). Plus the refusals before any connection:
 *                 http, a bad address, a host not allowed, a private address literal. A named
 *                 local origin (v0.27.0) is reached over http at a private address, and nothing
 *                 beside it is: not another port, address or scheme, and no redirect.
 * Depends on:     vitest, node:http, node:net
 * Source:         new in the kit (K62).
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FetchRefused, guardedFetch, publicLookup } from './guardedFetch.js';

let server: http.Server;
let base = '';
let connections = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const path = req.url ?? '/';
    if (path === '/redirect') {
      res.writeHead(302, { location: '/ok' }).end();
    } else if (path === '/big') {
      res.writeHead(200).end('x'.repeat(5000));
    } else if (path === '/slow') {
      res.writeHead(200);
      res.write('a');
      // never ends: the timeout must cut it off
    } else if (path === '/echo') {
      const parts: Buffer[] = [];
      req.on('data', (c: Buffer) => parts.push(c));
      req.on('end', () => res.writeHead(201, { 'x-seen': 'yes' }).end(Buffer.concat(parts)));
    } else {
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"a":1}');
    }
  });
  server.on('connection', () => (connections += 1));
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const local = guardedFetch({ allowLocal: true, timeoutMs: 300, maxBytes: 1000 });

describe('the exchange', () => {
  it('gives status, headers and body as a Response', async () => {
    const r = await local(`${base}/ok`);
    expect(r.ok).toBe(true);
    expect(r.headers.get('content-type')).toBe('application/json');
    expect(await r.json()).toEqual({ a: 1 });
  });

  it('sends a POST body and keeps a non-200 status', async () => {
    const r = await local(`${base}/echo`, { method: 'POST', body: 'hello' });
    expect(r.status).toBe(201);
    expect(r.headers.get('x-seen')).toBe('yes');
    expect(await r.text()).toBe('hello');
  });

  it('opens a connection of its own for every call', async () => {
    const before = connections;
    await local(`${base}/ok`);
    await local(`${base}/ok`);
    expect(connections - before).toBe(2);
  });

  it('refuses a redirect and does not follow it', async () => {
    await expect(local(`${base}/redirect`)).rejects.toThrow(FetchRefused);
  });

  it('cuts off an answer larger than the limit', async () => {
    await expect(local(`${base}/big`)).rejects.toThrow(/too large/);
  });

  it('times out a body that never ends', async () => {
    await expect(local(`${base}/slow`)).rejects.toThrow(/timed out/);
  });

  it('is aborted by the caller', async () => {
    const abort = new AbortController();
    const pending = local(`${base}/slow`, { signal: abort.signal });
    abort.abort();
    await expect(pending).rejects.toThrow();
  });
});

describe('before any connection', () => {
  const strict = guardedFetch({ allowedHosts: ['feed.example'] });
  const open = guardedFetch();

  it.each([
    ['plain http', open, 'http://feed.example/x', /https/],
    ['not an address', open, 'not a url', /not an address/],
    ['a host not allowed', strict, 'https://other.example/x', /host/],
    ['a loopback literal', open, 'https://127.0.0.1/x', /not public/],
    ['an IPv6 loopback literal', open, 'https://[::1]/x', /not public/],
    ['a mapped IPv4 loopback in hex form', open, 'https://[::ffff:7f00:1]/x', /not public/],
    ['the metadata address', open, 'https://169.254.169.254/x', /not public/],
  ] as const)('refuses %s', async (_name, fetcher, address, message) => {
    await expect(fetcher(address)).rejects.toThrow(message);
  });

  it('refuses plain http when allowLocal is off', async () => {
    await expect(guardedFetch({ allowLocal: false })(`${base}/ok`)).rejects.toThrow(/https/);
  });
});

describe('a local origin the game names (v0.27.0)', () => {
  const named = (): ReturnType<typeof guardedFetch> =>
    guardedFetch({ localOrigins: [base], timeoutMs: 1000 });

  it('is reached over plain http at a private address, by exactly that origin', async () => {
    expect((await named()(`${base}/ok`)).status).toBe(200);
  });

  it.each([
    ['the same host on another port', () => 'http://127.0.0.1:1/ok', /https/],
    ['another private address', () => base.replace('127.0.0.1', '127.0.0.2'), /https/],
    ['another private address over https', () => 'https://10.0.0.1/ok', /not public/],
    ['the same host over https', () => base.replace('http:', 'https:'), /not public/],
  ])('gives nothing to %s', async (_name, address, message) => {
    await expect(named()(address())).rejects.toThrow(message);
  });

  it('still refuses a redirect from it', async () => {
    const before = connections;
    await expect(named()(`${base}/redirect`)).rejects.toThrow(/redirect/);
    expect(connections - before).toBeLessThanOrEqual(1);
  });

  it('keeps the allowed hosts', async () => {
    const both = guardedFetch({ localOrigins: [base], allowedHosts: ['feed.example'] });
    await expect(both(`${base}/ok`)).rejects.toThrow(/host/);
  });

  it.each([
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3000/api',
    'http://*.internal',
    'ftp://website',
    'HTTP://Website',
    'http://website:80',
    'website:3000',
    '',
  ])('refuses the entry %j when it is built', (entry) => {
    expect(() => guardedFetch({ localOrigins: [entry] })).toThrow(/exact origins/);
  });
});

// A stub resolver: answers from a list, one answer per call.
function resolverOf(...answers: string[][]): NonNullable<Parameters<typeof publicLookup>[0]> {
  let call = 0;
  return ((_host: string, _options: unknown, callback: (...args: unknown[]) => void) => {
    const addresses = answers[Math.min(call, answers.length - 1)] ?? [];
    call += 1;
    callback(
      null,
      addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
    );
  }) as unknown as NonNullable<Parameters<typeof publicLookup>[0]>;
}

describe('the socket lookup (DNS rebinding)', () => {
  const ask = (lookup: ReturnType<typeof publicLookup>): Promise<unknown> =>
    new Promise((resolve) => {
      lookup('feed.example', { all: true }, (error: Error | null, addresses: unknown) => {
        resolve(error ?? addresses);
      });
    });

  it('refuses a name that resolves to a private address, and connects to nothing', async () => {
    const before = connections;
    const fetcher = guardedFetch({
      resolver: resolverOf(['127.0.0.1']),
      timeoutMs: 1000,
    });
    const port = base.split(':')[2] ?? '';
    await expect(fetcher(`https://feed.example:${port}/ok`)).rejects.toThrow(/not public/);
    expect(connections).toBe(before);
  });

  it('refuses one private address among public ones', async () => {
    const result = await ask(publicLookup(resolverOf(['93.184.216.34', '10.0.0.5'])));
    expect(result).toBeInstanceOf(FetchRefused);
  });

  it('refuses an empty answer', async () => {
    expect(await ask(publicLookup(resolverOf([])))).toBeInstanceOf(FetchRefused);
  });

  it('judges every answer afresh: public once, private the next time', async () => {
    const lookup = publicLookup(resolverOf(['93.184.216.34'], ['127.0.0.1']));
    expect(await ask(lookup)).toEqual([{ address: '93.184.216.34', family: 4 }]);
    expect(await ask(lookup)).toBeInstanceOf(FetchRefused);
  });

  it('gives the first address when one is asked for, and passes a resolver error on', async () => {
    const single = await new Promise<unknown>((resolve) => {
      publicLookup(resolverOf(['93.184.216.34']))('feed.example', {}, ((
        e: Error | null,
        address: string,
        family: number,
      ) => {
        resolve(e ?? [address, family]);
      }) as never);
    });
    expect(single).toEqual(['93.184.216.34', 4]);
    const broken = ((_h: string, _o: unknown, cb: (e: Error) => void) => {
      cb(new Error('no dns'));
    }) as unknown as NonNullable<Parameters<typeof publicLookup>[0]>;
    expect(await ask(publicLookup(broken))).toEqual(new Error('no dns'));
  });
});
