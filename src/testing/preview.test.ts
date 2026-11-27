/**
 * @file   src/testing/preview.test.ts
 * @brief  The local website-mode preview: its options, the one address, the signed-in member at
 *         the game, the call's stand-in, and a clean stop (K124).
 *
 * Responsibility: wrong or missing options are refused with a sentence and nothing starts, the
 *                 secret never printed; the address signs the test member in and leads to the
 *                 game's website sign-in, which receives the member's identity and the secret and
 *                 no e-mail address; the shared view says a live call; the command says what to
 *                 open, refuses a taken port and closes when stopped. The game is a tiny local
 *                 server.
 * Depends on:     vitest, node:http
 * Source:         new in the kit.
 */
import http, { type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { previewSettings, runPreview, startPreview } from './preview.js';

let app: http.Server;
let appAddress = '';
let seen: { url: string; headers: IncomingHttpHeaders }[] = [];

beforeAll(async () => {
  app = http.createServer((request, response) => {
    seen.push({ url: request.url ?? '', headers: request.headers });
    response.writeHead(200, { 'content-type': 'text/plain' }).end('the game');
  });
  await new Promise<void>((done) => app.listen(0, '127.0.0.1', done));
  appAddress = `http://127.0.0.1:${String((app.address() as AddressInfo).port)}`;
});

afterAll(() => {
  app.closeAllConnections();
  app.close();
});

// A port nothing listens on, for a test that needs a fixed one.
async function freePort(): Promise<number> {
  const probe = http.createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as AddressInfo;
  await new Promise((done) => probe.close(done));
  return port;
}

const SECRET = 'preview-test-secret-of-thirty-two-letters';
const env = { GAME_SECRET: SECRET };
const args = (more: Record<string, string> = {}): string[] =>
  Object.entries({
    slug: 'mini-games',
    app: appAddress,
    'secret-header': 'X-Smg-Proxy-Secret',
    'secret-env': 'GAME_SECRET',
    ...more,
  }).flatMap(([name, value]) => [`--${name}`, value]);

describe('previewSettings', () => {
  it('reads the options, with port 4400 and a plain member by default', () => {
    expect(previewSettings(args(), env)).toMatchObject({
      slug: 'mini-games',
      app: appAddress,
      secret: SECRET,
      port: 4400,
      role: 'member',
      canHost: false,
    });
    const host = [...args({ role: 'organiser' }), '--can-host'];
    expect(previewSettings(host, env)).toMatchObject({ role: 'organiser', canHost: true });
  });

  it.each([
    [{ slug: '../x' }, /--slug/],
    [{ app: 'https://example.org' }, /--app is the game on this computer/],
    [{ 'secret-header': 'a b' }, /--secret-header/],
    [{ 'secret-env': 'NOT_SET' }, /--secret-env names a variable that is set: NOT_SET/],
    [{ port: '99999' }, /--port/],
    [{ role: 'owner' }, /--role/],
  ])('refuses %o', (wrong, sentence) => {
    expect(() => previewSettings(args(wrong), env)).toThrow(sentence);
  });
});

describe('startPreview', () => {
  it('signs the test member in at the game through its one address, and stops', async () => {
    const port = await freePort();
    const preview = await startPreview(previewSettings(args({ port: String(port) }), env));
    expect(preview.address).toBe(
      `http://127.0.0.1:${String(port)}/login?next=%2Fgames%2Fmini-games%2Fauth%2Fwebsite`,
    );
    const login = await fetch(preview.address, { redirect: 'manual' });
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    expect(login.headers.get('location')).toBe('/games/mini-games/auth/website');
    seen = [];
    await fetch(`${preview.origin}/games/mini-games/auth/website`, { headers: { cookie } });
    const got = seen.at(-1)?.headers ?? {};
    expect(got['x-acting-user']).toBe('Preview Member');
    expect(got['x-smg-proxy-secret']).toBe(SECRET);
    expect(JSON.stringify(got)).not.toContain('@');
    const call = await (await fetch(`${preview.origin}/embed/call/shared?theme=dark`)).text();
    expect(call).toContain('"call":7,"status":"live"');
    await preview.stop();
    await expect(fetch(preview.origin)).rejects.toThrow();
  });
});

describe('runPreview', () => {
  const run = async (argv: string[]) => {
    const said: string[] = [];
    const stops: (() => Promise<void>)[] = [];
    const status = await runPreview(
      argv,
      env,
      (line) => said.push(line),
      (stop) => stops.push(stop),
    );
    return { status, said, stops };
  };

  it('says what to open, never the secret, and stops when told', async () => {
    const port = String(await freePort());
    const first = await run(args({ port }));
    expect(first.status).toBe(0);
    expect(first.said[0]).toContain(`Open: http://127.0.0.1:${port}/login`);
    expect(first.said.join('\n')).not.toContain(SECRET);
    // The port is taken: the second start says so and starts nothing.
    const second = await run(args({ port }));
    expect([second.status, second.stops]).toEqual([1, []]);
    expect(second.said[0]).toContain('EADDRINUSE');
    await first.stops[0]?.();
    expect(first.said.at(-1)).toBe('Preview stopped.');
  });

  it('gives its usage on --help, and after a wrong option', async () => {
    const help = await run(['--help']);
    expect([help.status, help.said[0]?.startsWith('usage: sk-preview')]).toEqual([0, true]);
    const wrong = await run(['--nonsense']);
    expect(wrong.status).toBe(1);
    expect(wrong.said.at(-1)).toContain('usage: sk-preview');
  });
});
