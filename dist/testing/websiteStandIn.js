/**
 * @file   src/testing/websiteStandIn.ts
 * @brief  A stand-in of the Seasonal Entertainment website for a game's browser tests: one local
 *         server that is the website and its proxy.
 *
 * Responsibility: `startWebsiteStandIn(options)` listens on a free port of 127.0.0.1 and answers
 *                 as the website and its proxy do for the named games:
 *                 - the sign-in: `<base>/auth/website` through the proxy (./standInProxy) with the
 *                   website's authorize decision (./standInContract) for the member whose `se.sid`
 *                   cookie the browser carries; `GET /api/games/<slug>/authorize` itself, which
 *                   answers 500 to a request carrying the game's proxy secret header (since
 *                   v0.34.0: the secret never reaches the website);
 *                 - `/login?next=` sets that cookie for the member the test chose (`signInAs`) and
 *                   returns to a local `next` under `/games/`;
 *                 - `/api/public/season`, `/media/step-icons/<32 hex>.webp`;
 *                 - `/embed/chat?room=` and `/embed/call/<id>` (./standInFrames);
 *                 - every other path under a game's base goes to its app, WebSockets too.
 *                 `openRounds(slug)` reads the game's open rounds as the website does. A game not
 *                 named answers 404, as a switched-off game does. `close()` ends every connection.
 *                 Test code only; it holds no real session and signs in whoever the test names.
 * Depends on:     node:http, ./standInContract, ./standInFrames, ./standInProxy
 * Source:         new in the kit (K74), the contract half of seasonal-mini-games
 *                 e2e/websiteStub.ts at 9e3c6f3, seasonal-cases e2e/websiteStub.ts at 073f9ad and
 *                 seasonal-bingo-royale e2e/websiteStack.ts at 8d20904. Their databases, nginx
 *                 containers and ports stay in the games.
 * Spec:           website docs/GAME-INTEGRATION.md at cc743b9
 */
import http, {} from 'node:http';
import { safeNext } from '../server/returnPath.js';
import { authorize, checkOpenRounds, seasonFeed, } from './standInContract.js';
import { framePage, FRAME_MESSAGES } from './standInFrames.js';
import { appHeaders, forward, forwardUpgrade, } from './standInProxy.js';
// Every step icon: the stand-in's own plain shape, a blue-grey diamond on 64 x 64 (the website's
// size), so a header and a board show something. No Seasonal Tokens drawing.
const ICON = Buffer.from('UklGRsAAAABXRUJQVlA4TLMAAAAvP8APEA8wiqM3qvMf8HBU27bT0Bki4UtBGkhDChIYpt+Uc7KQENF/Rm7bONKctsopr6jOnLUmW0v2kRwTuRTymMlrIQmlSQ1p0kKajJAmE6RJgTSZIU0WShNKkxpSBN9/jJAi+OVHgRTBXz8WShNKk3oj7U7Gg0wXUh5kNr7wK/6R87se1ed6Xb/74f64X+6f+6n+ut/uv+fh+Xhenp/nqfl63p6/98H74X3x/vzZpxOnAgA=', 'base64');
// The one folder a login may return to.
const GAMES = '/games/';
const targetOf = (state, path) => {
    const slug = /^\/games\/([a-z0-9-]+)(?:\/|$)/.exec(path)?.[1] ?? '';
    const game = Object.hasOwn(state.options.games, slug) ? state.options.games[slug] : undefined;
    return game === undefined ? null : { game, base: `/games/${slug}` };
};
// The member the browser's website cookie names.
function memberOf(state, request) {
    const id = /(?:^|;\s*)(?:__Host-)?se\.sid=(\d+)/.exec(request.headers.cookie ?? '')?.[1];
    return state.options.members?.find((m) => String(m.id) === id) ?? null;
}
const asked = (state, request, original) => authorize({
    method: 'GET',
    originalMethod: original,
    origin: request.headers.origin,
    siteOrigin: state.origin,
}, memberOf(state, request));
function send(response, status, type, body) {
    response.writeHead(status, { 'content-type': type });
    response.end(body);
}
function login(state, url, response) {
    // The kit's own return-path rule, under the games' folder; anything else goes to its start.
    const next = safeNext(url.searchParams.get('next'), GAMES);
    const cookie = state.chosen === null ? [] : [`se.sid=${String(state.chosen)}; Path=/; SameSite=Lax`];
    response.writeHead(302, {
        location: `${GAMES}${next.slice(GAMES.length)}`,
        'set-cookie': cookie,
    });
    response.end();
}
// `GET /api/games/<slug>/authorize`: a game switched off answers 404.
function authorizeRoute(state, request, slug, response) {
    const target = targetOf(state, `/games/${slug}`);
    if (target === null) {
        response.writeHead(404, { 'cache-control': 'no-store' }).end();
        return;
    }
    // The proxy's secret must never reach the website: a request that carries it is refused.
    if (request.headers[target.game.secretHeader.toLowerCase()] !== undefined) {
        response.writeHead(500, { 'cache-control': 'no-store' }).end();
        return;
    }
    const original = request.headers['x-original-method'];
    const answer = authorize({
        method: request.method ?? 'GET',
        originalMethod: typeof original === 'string' ? original : undefined,
        origin: request.headers.origin,
        siteOrigin: state.origin,
    }, memberOf(state, request));
    response.writeHead(answer.status, answer.headers).end();
}
// The chat's and the call's frames; false for any other path.
function frames(state, request, url, response) {
    const signedIn = memberOf(state, request) !== null;
    const call = /^\/embed\/call\/([1-9]\d{0,9})$/.exec(url.pathname)?.[1];
    let page;
    if (url.pathname === '/embed/chat') {
        const room = url.searchParams.get('room');
        page = framePage('chat', { ...FRAME_MESSAGES.chat.ready, room, signedIn });
    }
    else if (call !== undefined) {
        page = framePage('call', { ...FRAME_MESSAGES.call.ready, call: Number(call), signedIn });
    }
    else {
        return false;
    }
    send(response, 200, 'text/html; charset=utf-8', page);
    return true;
}
// The website's own routes; false when the path is not one of them.
function website(state, request, url, response) {
    const path = url.pathname;
    const slug = /^\/api\/games\/([a-z0-9-]+)\/authorize$/.exec(path)?.[1];
    if (slug !== undefined) {
        authorizeRoute(state, request, slug, response);
    }
    else if (path === '/login') {
        login(state, url, response);
    }
    else if (path === '/api/public/season') {
        response.setHeader('cache-control', 'public, max-age=60');
        send(response, 200, 'application/json', JSON.stringify(seasonFeed(Date.now())));
    }
    else if (/^\/media\/step-icons\/[0-9a-f]{32}\.webp$/.test(path)) {
        send(response, 200, 'image/webp', ICON);
    }
    else {
        return frames(state, request, url, response);
    }
    return true;
}
function handle(state, request, response) {
    const url = new URL(request.url ?? '/', 'http://stand-in');
    if (website(state, request, url, response))
        return;
    const target = targetOf(state, url.pathname);
    if (target === null || url.pathname.startsWith(`${target.base}/metrics`)) {
        send(response, 404, 'text/plain', 'not found');
        return;
    }
    const headers = appHeaders(request, target, () => asked(state, request, request.method));
    if ('redirect' in headers && typeof headers.redirect === 'string') {
        response.writeHead(302, { location: headers.redirect }).end();
        return;
    }
    forward(request, response, target.game.app, headers);
}
function upgrade(state, request, socket) {
    const target = targetOf(state, new URL(request.url ?? '/', 'http://stand-in').pathname);
    if (target === null) {
        socket.destroy();
        return;
    }
    const headers = appHeaders(request, target, () => asked(state, request, request.method));
    if ('redirect' in headers && typeof headers.redirect === 'string')
        socket.destroy();
    else
        forwardUpgrade(request, socket, target.game.app, headers);
}
async function readOpenRounds(state, slug, publicOrigin = state.origin.replace(/^http:/, 'https:')) {
    const target = targetOf(state, `/games/${slug}`);
    if (target === null)
        throw new Error(`no game ${slug} at the stand-in`);
    const answer = await fetch(new URL(`${target.base}/api/public/open-rounds`, target.game.app));
    if (!answer.ok)
        throw new Error(`the game answered ${String(answer.status)}`);
    // The website reads the page at its own https origin, so join links must be on it.
    return checkOpenRounds(await answer.json(), publicOrigin, Date.now());
}
export async function startWebsiteStandIn(options) {
    const state = { options, origin: '', chosen: null };
    const server = http.createServer((request, response) => {
        handle(state, request, response);
    });
    // Upgraded sockets are no longer the server's own, so they are kept to be closed.
    const upgraded = new Set();
    server.on('upgrade', (request, socket) => {
        upgraded.add(socket);
        upgrade(state, request, socket);
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    state.origin = `http://127.0.0.1:${String(server.address().port)}`;
    return {
        origin: state.origin,
        signInAs: (memberId) => {
            state.chosen = memberId;
        },
        sessionCookie: (memberId) => ({ name: 'se.sid', value: String(memberId), url: state.origin }),
        openRounds: (slug, publicOrigin) => readOpenRounds(state, slug, publicOrigin),
        close: () => new Promise((done) => {
            for (const socket of upgraded)
                socket.destroy();
            server.close(() => {
                done();
            });
            server.closeAllConnections();
        }),
    };
}
