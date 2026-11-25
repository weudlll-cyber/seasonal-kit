/**
 * @file   showcase/standin.spec.ts
 * @brief  The stand-in website in a real browser: sign-in through its proxy, and its chat and call
 *         frames talking to a game's page (v0.26.0, K74).
 *
 * Responsibility: a tiny game app behind the stand-in. The browser, signed in by the stand-in's
 *                 `/login`, opens the sign-in route and the app receives the member and the secret;
 *                 the game page frames `/embed/chat` and `/embed/call/7` and gets each `ready`
 *                 (with `signedIn`), then an unread count the frame says on request; what the page
 *                 posts reaches the frame. The contract itself is judged field by field in
 *                 src/testing/websiteStandIn.test.ts.
 * Depends on:     @playwright/test, node:http, ../src/testing
 * Source:         new in the kit.
 */
import http, { type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

import { expect, test } from '@playwright/test';

import { startWebsiteStandIn, type WebsiteStandIn } from '../src/testing/index.js';

const PAGE = `<!doctype html><meta charset="utf-8"><title>game</title>
<script>window.heard = []; addEventListener('message', function (e) {
  if (e.origin === location.origin) window.heard.push(e.data);
});</script>
<iframe id="chat" src="/embed/chat?room=mini-games"></iframe>
<iframe id="call" src="/embed/call/7"></iframe>`;

let app: http.Server;
let site: WebsiteStandIn;
let signIns: IncomingHttpHeaders[] = [];

test.beforeAll(async () => {
  app = http.createServer((request, response) => {
    if (request.url?.startsWith('/games/mini-games/auth/website')) signIns.push(request.headers);
    response.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
  });
  await new Promise<void>((done) => app.listen(0, '127.0.0.1', done));
  site = await startWebsiteStandIn({
    games: {
      'mini-games': {
        app: `http://127.0.0.1:${String((app.address() as AddressInfo).port)}`,
        secretHeader: 'X-Smg-Proxy-Secret',
        secret: 'browser-test-secret',
      },
    },
    members: [{ id: 7, name: 'Ana', role: 'member' }],
  });
});

test.afterAll(async () => {
  await site.close();
  app.closeAllConnections();
  app.close();
});

test('a browser signs in through the stand-in and its frames talk to the game', async ({
  page,
}) => {
  signIns = [];
  site.signInAs(7);
  const back = encodeURIComponent('/games/mini-games/auth/website');
  await page.goto(`${site.origin}/login?next=${back}`);
  expect(signIns.at(-1)?.['x-acting-user']).toBe('Ana');
  expect(signIns.at(-1)?.['x-smg-proxy-secret']).toBe('browser-test-secret');

  await page.goto(`${site.origin}/games/mini-games/`);
  const heard = () => page.evaluate(() => (window as unknown as { heard: unknown[] }).heard);
  await expect
    .poll(async () => (await heard()).length, { message: 'both frames say ready' })
    .toBeGreaterThanOrEqual(2);
  expect(await heard()).toEqual(
    expect.arrayContaining([
      { source: 'seasonal-chat', type: 'ready', room: 'mini-games', signedIn: true },
      { source: 'seasonal-call', type: 'ready', call: 7, status: 'live', signedIn: true },
    ]),
  );

  const chat = page.frames().find((f) => f.url().includes('/embed/chat'));
  await chat?.evaluate(() => {
    (window as unknown as { say: (t: string, f: object) => void }).say('unread', {
      room: 'mini-games',
      count: 2,
    });
  });
  await expect
    .poll(async () => await heard())
    .toContainEqual({ source: 'seasonal-chat', type: 'unread', room: 'mini-games', count: 2 });

  await page.evaluate(() => {
    document
      .querySelector<HTMLIFrameElement>('#chat')
      ?.contentWindow?.postMessage(
        { source: 'seasonal-chat-host', type: 'visible', visible: false },
        location.origin,
      );
  });
  await expect
    .poll(async () => await chat?.evaluate(() => (window as unknown as { received: [] }).received))
    .toContainEqual({ source: 'seasonal-chat-host', type: 'visible', visible: false });
});
