/**
 * @file   src/testing/websiteStandIn.test.ts
 * @brief  Contract tests: the stand-in website against the website's documented contract, judged by
 *         the kit's own server checks (K74).
 *
 * Responsibility: each block names the contract lines it checks (website master cc743b9):
 *                 - AUTH.md "Embedded games": the authorize route's statuses and headers, which the
 *                   kit's `identityFrom` and `stepsFrom` must accept for a member and a guest;
 *                 - GAME-INTEGRATION.md §2: only the sign-in route carries identity and secret,
 *                   client-sent ones are cleared, the website's cookie never reaches the game, the
 *                   refusal's login hop, WebSocket upgrades, `/metrics` 404;
 *                 - the login's return path; the season feed, which `parseSeasonFeed` must accept;
 *                 - OPEN-ROUNDS.md: what is read and what is dropped, including the kit's own
 *                   `openRoundsPage`;
 *                 - EMBED.md and §9: every frame message, which the kit's `parseChat` and
 *                   `parseCall` must accept.
 * Depends on:     vitest, node:http
 * Source:         new in the kit.
 */
import http, { type IncomingHttpHeaders } from 'node:http';
import { connect, type AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseCall } from '../callView.js';
import { parseChat } from '../chatEmbed.js';
import { identityFrom, isWebsiteGuest } from '../server/identity.js';
import { openRoundsPage } from '../server/openRounds.js';
import { parseSeasonFeed } from '../server/seasonFeed.js';
import { stepsFrom } from '../server/steps.js';
import { authorize, checkOpenRounds, seasonFeed, type StandInMember } from './standInContract.js';
import { FRAME_MESSAGES, framePage } from './standInFrames.js';
import { startWebsiteStandIn, type WebsiteStandIn } from './websiteStandIn.js';

const ICON = '/media/step-icons/0123456789abcdef0123456789abcdef.webp';
const member: StandInMember = {
  id: 42,
  name: 'Walter',
  role: 'member',
  canHost: true,
  steps: [{ ladder: 'holder', name: 'Golden', icon: ICON }],
};

interface Seen {
  readonly url: string;
  readonly headers: IncomingHttpHeaders;
}
let app: http.Server;
let seen: Seen[] = [];
let site: WebsiteStandIn;
let roundsPage: unknown = { version: 1, rounds: [] };

beforeAll(async () => {
  app = http.createServer((request, response) => {
    seen.push({ url: request.url ?? '', headers: request.headers });
    if (request.url === '/games/mini-games/api/public/open-rounds') {
      response.end(JSON.stringify(roundsPage));
    } else if (request.url === '/games/mini-games/broken') {
      response.writeHead(500).end();
    } else response.writeHead(200, { 'x-app': 'yes' }).end('app');
  });
  app.on('upgrade', (request, socket) => {
    seen.push({ url: request.url ?? '', headers: request.headers });
    socket.end(
      'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nX-From: app\r\n\r\nhello',
    );
  });
  await new Promise<void>((done) => app.listen(0, '127.0.0.1', done));
  const at = `http://127.0.0.1:${String((app.address() as AddressInfo).port)}`;
  const game = { app: at, secretHeader: 'X-Smg-Proxy-Secret', secret: 'test-secret' };
  site = await startWebsiteStandIn({
    games: { 'mini-games': game, cases: { ...game, app: 'http://127.0.0.1:1' } },
    members: [member],
  });
});

afterAll(async () => {
  await site.close();
  app.close();
  app.closeAllConnections();
});

const get = (path: string, headers: Record<string, string> = {}, method = 'GET') =>
  fetch(`${site.origin}${path}`, { method, headers, redirect: 'manual' });
const asMember = { cookie: 'se.sid=42; own=1' };
const original = (method: string) => ({ 'x-original-method': method });
const plain = (headers: Headers): Record<string, string> => Object.fromEntries(headers.entries());

describe('GET /api/games/<slug>/authorize (AUTH.md "Embedded games")', () => {
  const route = '/api/games/mini-games/authorize';

  it('answers a member 204 with the six headers the kit reads', async () => {
    const r = await get(route, { ...asMember, ...original('GET') });
    expect(r.status).toBe(204);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const headers = plain(r.headers);
    expect(
      Object.keys(headers)
        .filter((h) => h.startsWith('x-acting-'))
        .sort(),
    ).toEqual([
      'x-acting-user',
      'x-acting-user-can-host',
      'x-acting-user-email-verified',
      'x-acting-user-id',
      'x-acting-user-roles',
      'x-acting-user-steps',
    ]);
    expect(identityFrom(headers, 'all')).toMatchObject({
      subject: '42',
      websiteName: 'Walter',
      canHost: true,
      emailVerified: true,
    });
    expect(stepsFrom(headers['x-acting-user-steps'], 'all')).toEqual({
      steps: member.steps,
      bad: false,
    });
  });

  it('answers anyone else 204 with the guest header alone, never 401', async () => {
    const r = await get(route, original('GET'));
    expect(r.status).toBe(204);
    const headers = plain(r.headers);
    expect(isWebsiteGuest(headers)).toBe(true);
    expect(Object.keys(headers).filter((h) => h.startsWith('x-acting-'))).toEqual([
      'x-acting-guest',
    ]);
  });
});

describe('what the authorize route refuses', () => {
  const route = '/api/games/mini-games/authorize';

  it('refuses another method (405) and an unknown or missing original method (403)', async () => {
    expect((await get(route, original('GET'), 'POST')).status).toBe(405);
    expect((await get(route)).status).toBe(403);
    expect((await get(route, original('TRACE'))).status).toBe(403);
    expect((await get('/api/games/bingo/authorize', original('GET'))).status).toBe(404);
  });

  it("asks a state-changing method for the website's own origin", () => {
    const ask = (method: string, origin?: string) =>
      authorize(
        { method: 'GET', originalMethod: method, origin, siteOrigin: 'https://site.example' },
        null,
      ).status;
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(ask(method), method).toBe(403);
      expect(ask(method, 'https://evil.example')).toBe(403);
      expect(ask(method, 'https://site.example')).toBe(204);
    }
    expect([ask('HEAD'), ask('OPTIONS')]).toEqual([204, 204]);
  });

  it("gives an admin the right to host without a grant, and an empty step list as '[]'", () => {
    const answer = authorize(
      { method: 'GET', originalMethod: 'GET', origin: undefined, siteOrigin: 'x' },
      { id: 1, name: 'A', role: 'admin' },
    );
    expect(answer.headers['x-acting-user-can-host']).toBe('true');
    expect(stepsFrom(answer.headers['x-acting-user-steps'], 'all')).toEqual({
      steps: [],
      bad: false,
    });
  });
});

describe('the proxy under /games/<slug>/ (GAME-INTEGRATION.md §2)', () => {
  const forged = {
    'x-acting-user-id': '999',
    'x-smg-proxy-secret': 'forged',
    cookie: '__Host-se.sid=42; own=1',
  };

  it('gives the sign-in route the identity and then the secret', async () => {
    seen = [];
    const r = await get('/games/mini-games/auth/website?next=%2Fx', forged);
    expect(await r.text()).toBe('app');
    expect(r.headers.get('x-app')).toBe('yes');
    expect(seen[0]?.url).toBe('/games/mini-games/auth/website?next=%2Fx');
    expect(seen[0]?.headers).toMatchObject({
      'x-acting-user-id': '42',
      'x-smg-proxy-secret': 'test-secret',
      cookie: 'own=1',
    });
  });

  it('gives a guest the guest header', async () => {
    seen = [];
    await get('/games/mini-games/auth/website', { cookie: 'se.sid=7' });
    expect(seen[0]?.headers['x-acting-guest']).toBe('true');
    expect(seen[0]?.headers['x-acting-user-id']).toBeUndefined();
    expect(seen[0]?.headers.cookie).toBeUndefined();
  });

  it('clears identity and secret on every other path', async () => {
    seen = [];
    await get('/games/mini-games/api', forged);
    const headers = seen[0]?.headers ?? {};
    expect(Object.keys(headers).filter((h) => h.startsWith('x-acting-'))).toEqual([]);
    expect(headers['x-smg-proxy-secret']).toBeUndefined();
    expect(headers.cookie).toBe('own=1');
  });

  it('sends a refused sign-in to the login route with the same query', async () => {
    const r = await get('/games/mini-games/auth/website?next=%2Fy', {}, 'POST');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/games/mini-games/auth/website/login?next=%2Fy');
  });

  it('answers 404 for metrics and games it does not run, and 502 for a silent game', async () => {
    expect((await get('/games/mini-games/metrics')).status).toBe(404);
    expect((await get('/games/bingo/')).status).toBe(404);
    expect((await get('/games/constructor/')).status).toBe(404);
    expect((await get('/nothing')).status).toBe(404);
    expect((await get('/games/cases/x')).status).toBe(502);
  });
});

describe('a WebSocket through the proxy', () => {
  const upgrade = (path: string): Promise<string> =>
    new Promise((resolve) => {
      const url = new URL(site.origin);
      const socket = connect(Number(url.port), url.hostname, () => {
        socket.write(
          `GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nCookie: se.sid=42; own=2\r\n\r\n`,
        );
      });
      let text = '';
      socket.on('data', (d) => (text += String(d)));
      socket.on('close', () => {
        resolve(text);
      });
      socket.setTimeout(1_000, () => socket.destroy());
    });

  it('passes a WebSocket upgrade on, cleaned, and drops one it cannot serve', async () => {
    seen = [];
    const answer = await upgrade('/games/mini-games/ws/');
    expect(answer).toMatch(/^HTTP\/1\.1 101/);
    expect(answer).toContain('x-from: app');
    expect(answer).toContain('hello');
    expect(seen[0]?.headers.cookie).toBe('own=2');
    expect(await upgrade('/games/bingo/ws')).toBe('');
    expect(await upgrade('/games/cases/ws')).toBe('');
    expect(await upgrade('/games/mini-games/broken')).toContain('101');
  });
});

describe('the login and the public routes', () => {
  it('signs in the chosen member and returns to a local game path only', async () => {
    site.signInAs(42);
    const r = await get('/login?next=%2Fgames%2Fmini-games%2Fauth%2Fwebsite');
    expect(r.headers.get('location')).toBe('/games/mini-games/auth/website');
    expect(r.headers.get('set-cookie')).toContain('se.sid=42');
    for (const next of ['https://evil.example', '//evil.example', '/games/\\x', '']) {
      const away = await get(`/login?next=${encodeURIComponent(next)}`);
      expect(away.headers.get('location'), next).toBe('/games');
    }
    site.signInAs(null);
    expect((await get('/login')).headers.get('set-cookie')).toBeNull();
    expect(site.sessionCookie(42)).toEqual({ name: 'se.sid', value: '42', url: site.origin });
  });

  it('serves the season feed the kit reads (GAME-INTEGRATION.md "Season feed")', async () => {
    const r = await get('/api/public/season');
    expect(r.headers.get('cache-control')).toBe('public, max-age=60');
    const feed = parseSeasonFeed(await r.json());
    expect(feed?.inSeason).toMatchObject({ season: 'autumn', token: 'AUTUMN' });
    expect(feed?.halvingDays).toHaveLength(2);
    const days = (seasonFeed(0) as { halvingDays: { day: string }[] }).halvingDays;
    expect(days.map((d) => d.day)).toEqual(['1969-12-02', '1970-04-11']);
  });

  it('serves a step icon', async () => {
    const r = await get(ICON);
    expect(r.headers.get('content-type')).toBe('image/webp');
    expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(20);
  });
});

const NOW = Date.parse('2026-11-26T12:00:00Z');
const round = {
  id: 'r1',
  title: 'Friday',
  kind: 'Seasonal Mini Games',
  startsAt: '2026-11-27T20:00:00Z',
  signupClosesAt: null,
  players: 0,
  maxPlayers: null,
  joinUrl: 'https://site.example/games/mini-games/#/m/1',
};

describe('open rounds (OPEN-ROUNDS.md)', () => {
  const check = (page: unknown) => checkOpenRounds(page, 'https://site.example', NOW);

  it("accepts what the kit's openRoundsPage lists", () => {
    const page = openRoundsPage(
      [
        {
          id: 'r1',
          title: 'Friday',
          kind: 'Seasonal Mini Games',
          startsAt: new Date(NOW + 1000),
          signupClosesAt: null,
          players: 2,
          maxPlayers: 8,
          joinUrl: 'https://site.example/games/mini-games/#/m/1',
        },
      ],
      { origin: 'https://site.example', now: NOW },
    );
    expect(check(page)).toMatchObject({ dropped: [], rounds: [{ id: 'r1' }] });
  });

  it.each([
    ['id', { id: '' }],
    ['title', { title: 'x'.repeat(81) }],
    ['title', { title: '   ' }],
    ['kind', { kind: 7 }],
    ['startsAt', { startsAt: '2026-11-27T20:00:00+01:00' }],
    ['signupClosesAt', { signupClosesAt: 'soon' }],
    ['sign-up closed', { signupClosesAt: '2026-11-26T11:59:00Z' }],
    ['players', { players: -1 }],
    ['maxPlayers', { maxPlayers: 0 }],
    ['joinUrl', { joinUrl: 'https://other.example/x' }],
    ['joinUrl', { joinUrl: 'http://site.example/x' }],
    ['joinUrl', { joinUrl: 'not a url' }],
  ])('drops a round that breaks %s', (rule, change) => {
    const read = check({ version: 1, rounds: [{ ...round, ...change }, round, null] });
    expect(read.rounds).toHaveLength(1);
    expect(read.dropped[0]).toBe(`round 1: ${rule}`);
    expect(read.dropped[1]).toBe('round 3: id');
  });

  it('reads 20 entries, ignores a higher version and refuses another page', () => {
    const many = Array.from({ length: 25 }, () => round);
    expect(check({ version: 1, rounds: many }).rounds).toHaveLength(20);
    expect(check({ version: 2, rounds: many })).toEqual({ rounds: [], dropped: [] });
    expect(check({ version: 1, rounds: [{ ...round, kind: '' }] }).rounds).toHaveLength(1);
    for (const page of [null, {}, { version: 1 }, { rounds: [] }, { version: 0, rounds: [] }]) {
      expect(() => check(page)).toThrow(/contract/);
    }
  });
});

describe("a game's open rounds, read through the stand-in", () => {
  it("reads a game's page as the website does", async () => {
    roundsPage = { version: 1, rounds: [round] };
    const read = await site.openRounds('mini-games', 'https://site.example');
    expect(read.rounds).toHaveLength(1);
    expect((await site.openRounds('mini-games')).dropped).toEqual(['round 1: joinUrl']);
    await expect(site.openRounds('bingo')).rejects.toThrow(/no game/);
    await expect(site.openRounds('cases')).rejects.toThrow();
  });
});

describe('the frames (EMBED.md and GAME-INTEGRATION.md §9)', () => {
  const { chat, call } = FRAME_MESSAGES;

  it("every chat message is one the kit's chat link accepts, unchanged", () => {
    for (const message of [chat.ready, chat.unread, chat.resize]) {
      expect(parseChat(message)).toEqual(message);
    }
    expect([chat.source, chat.host]).toEqual(['seasonal-chat', 'seasonal-chat-host']);
  });

  it("every call message is one the kit's call link accepts, unchanged", () => {
    for (const m of [call.ready, call.live, call.ended, call.speaking, call.resize, call.error]) {
      expect(parseCall(m)).toEqual(m);
    }
    expect([call.source, call.host]).toEqual(['seasonal-call', 'seasonal-call-host']);
  });

  it('serves both frames with their ready message', async () => {
    const chatPage = await (await get('/embed/chat?room=cases', asMember)).text();
    expect(chatPage).toContain('"room":"cases","signedIn":true');
    const callPage = await (await get('/embed/call/12')).text();
    expect(callPage).toContain('"call":12,"status":"live","signedIn":false');
    expect((await get('/embed/call/0')).status).toBe(404);
  });

  it('never posts to "*" and cannot be broken out of by a room name', () => {
    const page = framePage('chat', { type: 'ready', room: '</script><script>x' });
    expect(page).not.toContain("'*'");
    expect(page).not.toContain('</script><script>x');
    expect(page.match(/<\/script>/g)).toHaveLength(1);
  });
});
